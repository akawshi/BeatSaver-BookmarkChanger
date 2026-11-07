// ==UserScript==
// @name         BeatSaver-BookmarkChanger
// @version      1.1.1
// @description  ブックマークしたらカバーアートを背景化
// @match        https://beatsaver.com/*
// @exclude      https://beatsaver.com/maps/*
// @exclude      https://beatsaver.com/alerts
// @exclude      https://beatsaver.com/profile
// @grant        none
// ==/UserScript==

(function () {

"use strict";

/* CSS */

const style = document.createElement("style");

style.textContent = `
.bs-watermark{
    position:relative !important;
}

.bs-watermark::before{
    content:"";
    position:absolute;
    inset:0;
    background-size:cover;
    background-position:center;
    opacity:0.12;
    pointer-events:none;
}
`;

document.head.appendChild(style);


/* マップ詳細ページ判定
   @exclude は「ページ読み込み時点のURL」でしか効かないため、
   一覧ページから SPA 遷移で詳細ページに入った場合はコード側でも止める */

function isMapPage(){
    return /^\/maps\//.test(location.pathname);
}


/* 背景を外す */

function clearCard(card){
    if(!card.classList.contains("bs-watermark")) return;
    card.classList.remove("bs-watermark");
    card.style.backgroundImage = "";
    card.style.backgroundSize = "";
    card.style.backgroundPosition = "";
}


/* scan */

function scan(){

    /* 詳細ページでは何もせず、付いていたら掃除して終わる */
    if(isMapPage()){
        document.querySelectorAll(".bs-watermark").forEach(clearCard);
        return;
    }

    document.querySelectorAll("img.cover").forEach(img=>{

        const card = img.closest(".content");
        if(!card) return;

        /* bookmarkアイコン（押されたときはこの class がその場で切り替わる） */

        const bookmark = card.querySelector(
            "i.fas.fa-bookmark.text-warning"
        );

        if(bookmark){

            const bg = `url("${img.src}")`;

            /* 既に同じ状態なら何もしない（無駄なDOM変更→監視の再発火を防ぐ） */
            if(card.classList.contains("bs-watermark") && card.style.backgroundImage === bg) return;

            card.classList.add("bs-watermark");

            card.style.backgroundImage = bg;
            card.style.backgroundSize = "cover";
            card.style.backgroundPosition = "center";

        }else{

            /* ブックマークされていないカードは背景を外す
               （解除時と、仮想リストでノードが使い回された場合の残留防止） */
            clearCard(card);

        }

    });

}


/* 連続発火をまとめる */

let scanTimer = null;

function scheduleScan(delay = 100){
    if(scanTimer !== null) return;
    scanTimer = setTimeout(()=>{
        scanTimer = null;
        scan();
    }, delay);
}


/* DOM監視
   childList だけだと「アイコンの class 切り替え（属性変更）」を検知できず、
   fav を押しても scan が走らない。attributes（class と img の src）も監視する */

new MutationObserver(()=>scheduleScan()).observe(
    document.documentElement,
    {childList:true, subtree:true, attributes:true, attributeFilter:["class","src"]}
);


/* fav クリック直後にも保険で再チェック
   （サイト側の状態更新がAPI応答後になる場合に備えて少し遅らせても見る） */

document.addEventListener("click", (e)=>{
    if(e.target.closest("i.fa-bookmark")){
        scheduleScan(300);
        setTimeout(scan, 1000);
    }
}, true);


/* ページ遷移・戻る（SPA遷移 / bfcache復元）でも追従する */

window.addEventListener("popstate", ()=>scheduleScan());
window.addEventListener("pageshow", ()=>scheduleScan());

scan();



})();
