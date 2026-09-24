// Smallest prebuilt artifact the runtime accepts. images.yml boots the flow
// image on it: no imports, so it needs no node_modules beside it.
export default async function () {
  return {
    collector: {
      push: async () => ({ ok: true }),
      command: async () => ({ ok: true }),
    },
  };
}
