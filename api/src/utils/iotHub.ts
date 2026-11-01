import { Client, Registry } from "azure-iothub";

const serviceConnString = process.env.IOT_HUB_SERVICE_CONNECTION_STRING || process.env.IOT_HUB_REGISTRY_CONNECTION_STRING || "";
const registryConnString = process.env.IOT_HUB_REGISTRY_CONNECTION_STRING || process.env.IOT_HUB_SERVICE_CONNECTION_STRING || "";

export const iotServiceClient = serviceConnString ? Client.fromConnectionString(serviceConnString) : null;
export const iotRegistryClient = registryConnString ? Registry.fromConnectionString(registryConnString) : null;
