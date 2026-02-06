// Base URL cho avatar/chat images: phải có /api vì backend proxy là GET /api/uploads/avatar/:filename và /api/uploads/chat-images/:filename
const resolveAvatarBase = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  if (apiUrl && typeof apiUrl === 'string') {
    const base = apiUrl.replace(/\/api\/?$/, '');
    return base ? `${base}/api` : apiUrl;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return '';
};

export const buildAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (/^https?:\/\//i.test(avatarPath)) return avatarPath;

  const base = resolveAvatarBase();
  if (!base) {
    return avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  }
  return avatarPath.startsWith('/') ? `${base}${avatarPath}` : `${base}/${avatarPath}`;
};
