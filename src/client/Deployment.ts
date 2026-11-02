/** Public asset paths and the optional external server used by static hosting. */
export function assetUrl(path:string){return `${import.meta.env?.BASE_URL||'/'}${path.replace(/^\//,'')}`;}
const server=(import.meta.env?.VITE_SERVER_URL||'').replace(/\/$/,'');
export function gameServerUrl(path:string){return server?`${server}${path}`:path;}
export function needsGameServer(){return typeof location!=='undefined'&&location.hostname.endsWith('.github.io')&&!server;}
export const serverMissingMessage='这是 GitHub Pages 页面，联机服务尚未配置。小小花园、多人乱斗和试炼场需要连接游戏服务器。';
export function requireGameServer(){if(needsGameServer())throw new Error(serverMissingMessage);}
