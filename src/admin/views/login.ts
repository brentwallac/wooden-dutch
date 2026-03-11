import { layout } from "./layout.js";

export function loginPage(error?: string): string {
  return layout("Login", `
    <div class="login-container">
      <h1>The Wooden Dutch</h1>
      <p class="subtitle">Admin</p>
      ${error ? `<div class="error">${error}</div>` : ""}
      <form method="POST" action="/admin/login">
        <input type="password" name="password" placeholder="Password" required autofocus>
        <button type="submit">Sign In</button>
      </form>
    </div>
  `, false);
}
