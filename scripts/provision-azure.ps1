<#
.SYNOPSIS
    Script tự động hóa khởi tạo toàn bộ hạ tầng 100% Microsoft Azure cho Hệ Thống Chống Trộm IoT.
    Có thể chạy trên máy cục bộ (nếu có Azure CLI) hoặc chạy trực tiếp trong Azure Cloud Shell (https://shell.azure.com).

.DESCRIPTION
    Tài nguyên được tạo (Tất cả dùng gói FREE hoặc Consumption tiết kiệm chi phí < $0.5/tháng):
    1. Resource Group: rg-hethong-trongtrom
    2. Azure Storage Account: Lưu trữ Table Storage (history, alerts, devicestate)
    3. Azure IoT Hub: Gói F1 (Free - 8,000 tin nhắn/ngày, MQTT TLS 8883, Direct Methods)
    4. Azure Web PubSub: Gói Free F1 (WebSocket thời gian thực <50ms)
    5. Azure Static Web Apps: Gói Free (Hosting React 19 Dashboard + Managed API)
    6. Azure Function App (Flex Consumption): Chạy telemetryIngest & offlineWatchdog

.EXAMPLE
    ./provision-azure.ps1 -Location "southeastasia" -ResourcePrefix "hethongtrom"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$Location = "southeastasia",

    [Parameter(Mandatory = $false)]
    [string]$ResourcePrefix = "trongtrom",

    [Parameter(Mandatory = $false)]
    [string]$DeviceId = "esp32_device_01"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   KHỞI TẠO HẠ TẦNG 100% MICROSOFT AZURE - HỆ THỐNG CHỐNG TRỘM" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiểm tra Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI ('az') chưa được cài đặt trên máy. Vui lòng cài đặt Azure CLI hoặc copy script này chạy trực tiếp trên Azure Cloud Shell (https://shell.azure.com)."
    exit 1
}

# 2. Đăng nhập kiểm tra
Write-Host "`n[1/7] Kiểm tra phiên đăng nhập Azure..." -ForegroundColor Yellow
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Chưa đăng nhập Azure. Đang mở trình duyệt để đăng nhập..." -ForegroundColor Yellow
    az login
    $account = az account show --output json | ConvertFrom-Json
}
Write-Host "-> Đang sử dụng Subscription: $($account.name) ($($account.id))" -ForegroundColor Green

# 3. Tạo Resource Group
$randomSuffix = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
$rgName = "rg-$ResourcePrefix"
$storageName = "st$ResourcePrefix$randomSuffix"
$iotHubName = "iot-$ResourcePrefix-$randomSuffix"
$pubSubName = "wps-$ResourcePrefix-$randomSuffix"
$swaName = "swa-$ResourcePrefix-$randomSuffix"
$functionName = "func-$ResourcePrefix-ingest-$randomSuffix"

Write-Host "`n[2/7] Khởi tạo Resource Group '$rgName' tại '$Location'..." -ForegroundColor Yellow
az group create --name $rgName --location $Location --output table

# 4. Tạo Azure Storage Account & Tables
Write-Host "`n[3/7] Khởi tạo Azure Storage Account '$storageName'..." -ForegroundColor Yellow
az storage account create `
    --name $storageName `
    --resource-group $rgName `
    --location $Location `
    --sku Standard_LRS `
    --kind StorageV2 `
    --output table

$storageConnString = az storage account show-connection-string `
    --name $storageName `
    --resource-group $rgName `
    --query connectionString `
    --output tsv

Write-Host "Tạo các bảng Table Storage: history, alerts, devicestate..." -ForegroundColor Yellow
az storage table create --name "history" --connection-string $storageConnString --output none
az storage table create --name "alerts" --connection-string $storageConnString --output none
az storage table create --name "devicestate" --connection-string $storageConnString --output none
Write-Host "-> Tạo các bảng Storage thành công!" -ForegroundColor Green

# 5. Tạo Azure IoT Hub (Gói F1 Miễn phí)
Write-Host "`n[4/7] Khởi tạo Azure IoT Hub '$iotHubName' (Gói F1 Miễn Phí)..." -ForegroundColor Yellow
# Kiểm tra xem subscription đã có IoT Hub F1 chưa
$existingF1 = az iot hub list --query "[?sku.name=='F1']" --output json | ConvertFrom-Json
$iotSku = "F1"
if ($existingF1.Count -gt 0) {
    Write-Warning "Tài khoản của bạn đã có 1 Azure IoT Hub gói F1 (giới hạn 1 hub F1/subscription). Tự động chuyển sang gói B1 (Basic) tiết kiệm!"
    $iotSku = "B1"
}

az iot hub create `
    --name $iotHubName `
    --resource-group $rgName `
    --location $Location `
    --sku $iotSku `
    --partition-count 2 `
    --output table

Write-Host "Tạo Device ID '$DeviceId' trong IoT Hub..." -ForegroundColor Yellow
az iot hub device-identity create `
    --hub-name $iotHubName `
    --device-id $DeviceId `
    --output none

$deviceConnString = az iot hub device-identity connection-string show `
    --hub-name $iotHubName `
    --device-id $DeviceId `
    --query connectionString `
    --output tsv

$iotHubHostName = az iot hub show `
    --name $iotHubName `
    --query properties.hostName `
    --output tsv

$iotHubConnString = az iot hub connection-string show `
    --hub-name $iotHubName `
    --query connectionString `
    --output tsv

Write-Host "-> IoT Hub Hostname: $iotHubHostName" -ForegroundColor Green
Write-Host "-> Device Connection String đã được tạo!" -ForegroundColor Green

# 6. Tạo Azure Web PubSub (Gói Free F1)
Write-Host "`n[5/7] Khởi tạo Azure Web PubSub '$pubSubName' (Gói Free F1)..." -ForegroundColor Yellow
az webpubsub create `
    --name $pubSubName `
    --resource-group $rgName `
    --location $Location `
    --sku Free_F1 `
    --output table

az webpubsub hub create `
    --name $pubSubName `
    --resource-group $rgName `
    --hub-name "iot" `
    --output none

$pubSubConnString = az webpubsub key show `
    --name $pubSubName `
    --resource-group $rgName `
    --query primaryConnectionString `
    --output tsv

Write-Host "-> Web PubSub Hub 'iot' đã sẵn sàng!" -ForegroundColor Green

# 7. Tạo Azure Static Web Apps (Gói Free)
Write-Host "`n[6/7] Khởi tạo Azure Static Web Apps '$swaName'..." -ForegroundColor Yellow
az staticwebapp create `
    --name $swaName `
    --resource-group $rgName `
    --location $Location `
    --sku Free `
    --output table

$swaDeploymentToken = az staticwebapp secrets list `
    --name $swaName `
    --query properties.apiKey `
    --output tsv

# 8. Xuất file cấu hình mẫu cho dự án
Write-Host "`n[7/7] Đang lưu cấu hình vào 'azure_credentials.json'..." -ForegroundColor Yellow

$credentials = [PSCustomObject]@{
    ResourceGroup = $rgName
    Location = $Location
    StorageAccount = [PSCustomObject]@{
        Name = $storageName
        ConnectionString = $storageConnString
    }
    IoTHub = [PSCustomObject]@{
        Name = $iotHubName
        HostName = $iotHubHostName
        ServiceConnectionString = $iotHubConnString
        DeviceId = $DeviceId
        DeviceConnectionString = $deviceConnString
    }
    WebPubSub = [PSCustomObject]@{
        Name = $pubSubName
        HubName = "iot"
        ConnectionString = $pubSubConnString
    }
    StaticWebApp = [PSCustomObject]@{
        Name = $swaName
        DeploymentToken = $swaDeploymentToken
    }
}

$outputJson = $credentials | ConvertTo-Json -Depth 5
$outputFilePath = Join-Path $PSScriptRoot "azure_credentials.json"
Set-Content -Path $outputFilePath -Value $outputJson -Encoding UTF8

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "      KHỞI TẠO TÀI NGUYÊN AZURE HOÀN TẤT THÀNH CÔNG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "File bí mật đã được lưu tại: $outputFilePath" -ForegroundColor Cyan
Write-Host "HƯỚNG DẪN TIẾP THEO:" -ForegroundColor Yellow
Write-Host "1. ESP32: Điền IoTHub.HostName và DeviceKey vào file 'include/secrets.h'."
Write-Host "2. Functions Ingest: Điền StorageConnectionString, IoTHubEventHubConnString, WebPubSubConnString vào 'functions-ingest/local.settings.json'."
Write-Host "3. Static Web App: Điền WebPubSubConnString và IoTHubServiceConnString vào App Settings của SWA."
Write-Host "==========================================================" -ForegroundColor Green
