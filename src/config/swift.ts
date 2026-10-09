import { SWIFT_ENVIRONMENTS, getEnvironmentConfig, getActiveEnvironments } from "@/lib/swift/environments";

export const SWIFT_APP_CONFIG = {
  name: "SWIFT API Console",
  version: "2.1.1",
  specVersion: "2.1.1",
  description: "Enterprise developer console for SWIFT Alliance Cloud Messaging APIs",
  defaultEnvironment: "sandbox" as const,
  supportedServices: [
    {
      id: "distributions",
      name: "Distributions",
      description: "Manage message retrieval, delivery lists, batching acknowledgements (ACKs) and negative acknowledgements (NAKs).",
      icon: "Layers",
      badge: "Core",
    },
    {
      id: "fin",
      name: "FIN Messaging",
      description: "Send and receive MT format messages, transmission reports, delivery reports, delivery notifications, and archives.",
      icon: "FileText",
      badge: "ISO 15022 / MT",
    },
    {
      id: "interact",
      name: "InterAct Messaging",
      description: "Real-time and store-and-forward interactive messaging (ISO 20022 MX, XML, proprietary payloads).",
      icon: "MessageSquare",
      badge: "ISO 20022 / MX",
    },
    {
      id: "fileact",
      name: "FileAct Messaging",
      description: "Large-volume batch file transfer service for high-volume transactions and reporting.",
      icon: "FolderArchive",
      badge: "Bulk / Files",
    },
  ],
};

export { SWIFT_ENVIRONMENTS, getEnvironmentConfig, getActiveEnvironments };
