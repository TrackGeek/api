export function extractNameFromEmail(email: string): string {
	if (!email.includes("@")) return "";

	const name = email.split("@")[0].replace(/\./g, "");

	return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function extractUsernameFromEmail(email: string): string {
	if (!email.includes("@")) return "";

	const username = email.split("@")[0];

	return username.toLowerCase();
}
