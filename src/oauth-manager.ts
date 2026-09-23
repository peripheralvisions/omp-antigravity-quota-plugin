import crypto from "node:crypto";
import http, { type IncomingMessage, type ServerResponse } from "node:http";

export interface OAuthResult {
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  projectId: string;
}

export class OAuthManager {
  private clientId: string;
  private clientSecret: string;
  private scopes: string[];

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/cclog",
      "https://www.googleapis.com/auth/experimentsandconfigs",
      "openid"
    ];
  }

  public async loginInteractive(port: number = 51121): Promise<OAuthResult> {
    const redirectUri = `http://localhost:${port}/oauth-callback`;
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", this.clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", this.scopes.join(" "));
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    console.log(`\n[Antigravity Login] Please open this URL in your browser to sign in:\n\n${authUrl.toString()}\n`);

    const code = await new Promise<string>((resolve, reject) => {
      const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
        const reqUrl = new URL(req.url || "", `http://localhost:${port}`);
        if (reqUrl.pathname === "/oauth-callback") {
          const receivedCode = reqUrl.searchParams.get("code");
          const error = reqUrl.searchParams.get("error");

          if (error) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h3>Authentication Failed</h3><p>You may close this tab.</p>");
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (receivedCode) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end("<h3>Authentication Successful!</h3><p>You can close this tab and return to oh-my-pi.</p>");
            server.close();
            resolve(receivedCode);
            return;
          }
        }
        res.writeHead(404);
        res.end("Not Found");
      });

      server.listen(port, () => {
        try {
          Bun.spawn(process.platform === "win32" ? ["cmd", "/c", "start", authUrl.toString()] : ["open", authUrl.toString()]);
        } catch {}
      });

      server.on("error", reject);
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${err}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    let email = "antigravity-user@gmail.com";
    let name = "Antigravity User";
    if (userInfoRes.ok) {
      const userInfo = (await userInfoRes.json()) as { email?: string; name?: string };
      if (userInfo.email) email = userInfo.email;
      if (userInfo.name) name = userInfo.name;
    }

    return {
      email,
      name,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      projectId: "aicode-consumers"
    };
  }
}
