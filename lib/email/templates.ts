// Email templates this app can actually render and send itself via
// sendEmail(). Magic-link and email-verification templates are NOT here --
// those are rendered and sent by Supabase Auth's own SMTP relay,
// configured in the Supabase dashboard, not by this app's code.
export function invitationEmail(input: { organizationName: string; inviteUrl: string }): { subject: string; html: string } {
  return {
    subject: `You're invited to join ${input.organizationName} on AvatarK`,
    html: `
      <p>You've been invited to join <strong>${escapeHtml(input.organizationName)}</strong> on AvatarK.</p>
      <p><a href="${escapeHtml(input.inviteUrl)}">Accept the invitation</a></p>
      <p>If you weren't expecting this, you can safely ignore this email.</p>
    `.trim(),
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
