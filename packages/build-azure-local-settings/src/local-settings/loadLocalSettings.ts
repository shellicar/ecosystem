export const loadLocalSettings = async (): Promise<void> => {
  const { StartHostAction } = await import('./StartHostAction');
  const host = new StartHostAction();
  await host.buildWebHost();
};
