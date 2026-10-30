import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="forbidden">
      <span>403</span>
      <h1>Access restricted</h1>
      <p>Your account does not have permission to open this area. If you need access, contact your workspace administrator.</p>
      <a routerLink="/dashboard">Return to dashboard</a>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background:#f5f7fa; }
    .forbidden { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:25px; text-align:center; }
    .forbidden > span { font-size:11px; font-weight:800; letter-spacing:1.5px; color:#4c88b8; }
    h1 { color:#1d3448; font-size:26px; margin:10px 0; }.forbidden p { max-width:420px; color:#718392; font-size:13px; line-height:1.65; }
    a { margin-top:12px; padding:11px 16px; border-radius:7px; background:#1e6da7; color:#fff; text-decoration:none; font-size:12px; }
  `],
})
export class ForbiddenComponent {}
