import KeycloakProvider from "../components/Auth/KeycloakProvider";
import "./globals.css";

export const metadata = {
  title: "Frontend",
  description: "Frontend zabezpieczony Keycloak",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>
        <KeycloakProvider>
          <main>{children}</main>
        </KeycloakProvider>
      </body>
    </html>
  );
}
