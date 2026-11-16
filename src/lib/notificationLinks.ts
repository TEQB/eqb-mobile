/**
 * Maps web-app notification links to mobile-app routes.
 * The server generates web paths like /question/{id}, /study-groups/{id}, etc.
 * Mobile routes differ: /question/[id], /group/[id], /(tabs)/groups, etc.
 */
export function mapNotificationLink(link: string | null): string | null {
  if (!link) return null;

  // Question links: /question/{id} or /questions/{id}
  const questionMatch = link.match(/^\/questions?\/([a-f0-9-]+)/i);
  if (questionMatch) {
    return `/question/${questionMatch[1]}`;
  }

  // Study group links: /study-groups/{id}
  const groupMatch = link.match(/^\/study-groups\/([a-f0-9-]+)/i);
  if (groupMatch) {
    return `/group/${groupMatch[1]}`;
  }

  // Study groups list
  if (link === "/study-groups" || link === "/study-groups/") {
    return "/(tabs)/groups";
  }

  // Course links: /course/{id}
  const courseMatch = link.match(/^\/course\/([a-f0-9-]+)/i);
  if (courseMatch) {
    return `/course/${courseMatch[1]}`;
  }

  // Upload link
  if (link.startsWith("/upload")) {
    return "/(tabs)/upload";
  }

  // Browse link
  if (link === "/browse" || link === "/browse/") {
    return "/(tabs)/browse";
  }

  // Dashboard/Home
  if (link === "/dashboard" || link === "/") {
    return "/(tabs)/home";
  }

  // Profile
  if (link === "/profile") {
    return "/(tabs)/profile";
  }

  // Contributions / My Work
  if (link === "/contributions") {
    return "/(tabs)/my-work";
  }

  // Feedback
  if (link === "/feedback") {
    return "/feedback";
  }

  // Announcements — just go to home
  if (link === "/announcements") {
    return "/(tabs)/home";
  }

  // Default: try to use as-is (might be a valid mobile route)
  return link;
}
