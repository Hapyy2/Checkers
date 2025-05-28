import Keycloak from "keycloak-js";

let keycloakInstance = null;

const getKeycloakInstance = () => {
  if (typeof window !== "undefined" && !keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8080",
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "your-realm",
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "your-client-id",
    });
  }
  return keycloakInstance;
};

export default getKeycloakInstance;
