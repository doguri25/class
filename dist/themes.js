export const THEMES = {
 mint: {name:'학교 녹색',desc:'차분한 녹색과 진한 원목',wall:'#d4d6c8',floor:'#aaa38d',desk:'#956432',chair:'#a96e31',page:'#cbd2c8',panel:'#e5e9de',card:'#f4f4ea',ink:'#293d35',muted:'#53645a',accent:'#315d4d',soft:'#d3e0d2',line:'#a4b5a4'},
 sky: {name:'푸른 교실',desc:'청회색 벽과 갈색 책상',wall:'#c6d3d8',floor:'#a5a598',desk:'#865f3e',chair:'#617e8b',page:'#c5d1d9',panel:'#e0e7eb',card:'#f1f4f4',ink:'#263f51',muted:'#536876',accent:'#315e79',soft:'#cbdde6',line:'#a0b8c6'},
 yellow: {name:'햇살 원목',desc:'크림 벽과 따뜻한 나무색',wall:'#e0d7bd',floor:'#b9a381',desk:'#875b31',chair:'#a67b40',page:'#d6cab2',panel:'#eae2cf',card:'#f6f0e3',ink:'#493d2d',muted:'#716047',accent:'#7a582e',soft:'#e5d6b6',line:'#bcaa87'},
 navy: {name:'단정한 남색',desc:'회청색 공간과 짙은 가구',wall:'#b8c6cc',floor:'#999a92',desk:'#745339',chair:'#4c6278',page:'#bcc7d1',panel:'#dbe3e9',card:'#edf1f4',ink:'#26394d',muted:'#51667b',accent:'#314f70',soft:'#c7d5e2',line:'#96acc0'}
};
export const themeFor=id=>THEMES[id]||THEMES.mint;
export function applyTheme(id,root=document.documentElement){const theme=themeFor(id);for(const key of ['page','panel','card','ink','muted','accent','soft','line'])root.style.setProperty('--theme-'+key,theme[key]);root.dataset.theme=THEMES[id]?id:'mint';}
