export const simulateNotify = ({ channel, to, payload }) => {
  const stamp = new Date().toISOString();
  // Placeholder for SMS/push integration.
  console.log(`[notify:${channel}] ${stamp}`, { to, payload });
};
