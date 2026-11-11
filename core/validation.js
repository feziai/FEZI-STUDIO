/** Shared path, hostname and request validation; no filesystem side effects. */
import path from 'node:path';
export const MAX_PROJECT_FILE_BYTES = 240_000;
export function projectId(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{16}$/.test(id)) throw Object.assign(new Error('Invalid project ID'), {status:400});
  return id;
}
export function fileName(name) {
  if (typeof name !== 'string' || !name || name.length > 150 || name.includes('\\') || name.startsWith('/') || name.includes('\0') ||
      name.split('/').some(s => !s || s === '.' || s === '..' || (s.startsWith('.') && !['.gitignore','.editorconfig','.env.example'].includes(s))) ||
      !/^[\w./@() +-]+$/.test(name)) throw Object.assign(new Error('Invalid filename'), {status:400});
  return name;
}
export function isSafeStatic(name) {
  try { fileName(name); } catch { return false; }
  return !name.split('/').some(s => s.startsWith('.')) && /\.(html|css|js|mjs|json|txt|md|svg|xml|webmanifest)$/i.test(name);
}
export function isSafeAssetInside(root, relative) {
  const result=path.resolve(root,relative), base=path.resolve(root);
  return result.startsWith(base+path.sep);
}
/** Model IDs may contain namespaces like Qwen/Qwen3, never filesystem traversal segments. */
export function validateModelName(model){
  if(typeof model!=='string' || model.length<1 || model.length>130 ||
     !/^[\w.\-:/@+]+$/.test(model) || model.startsWith('/') ||
     model.split('/').some(seg => !seg || seg==='.' || seg==='..'))
     throw Object.assign(new Error('Invalid model name'),{status:400});
  return model;
}
