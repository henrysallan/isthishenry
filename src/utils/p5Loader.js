// Shared p5 lazy-loader — ensures only one import() call across the app
let p5Module = null;
let loadPromise = null;

export const loadP5 = () => {
  if (p5Module) return Promise.resolve(p5Module);
  if (loadPromise) return loadPromise;
  loadPromise = import('p5').then(mod => {
    p5Module = mod.default;
    return p5Module;
  });
  return loadPromise;
};

export const getP5 = () => p5Module;
