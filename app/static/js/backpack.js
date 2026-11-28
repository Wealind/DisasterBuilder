"use strict";
// 非常持ち出し管理

let bpItems = [];
let bpBags = [];
let bpSelectedBag = null;
let bpSelectedItem = null;
// 共通実写画像

const BP_ITEM_IMAGES = {
    "飲料水": "water.webp",
    "非常食": "emergency_food.webp",
    "携帯トイレ": "portable_toilet.webp",
    "マスク": "mask.webp",
    "生理用品": "sanitary_products.webp",
    "懐中電灯": "flashlight.webp",
    "モバイルバッテリー": "mobile_battery.webp",
    "充電ケーブル": "charging_cable.webp",
    "アルミブランケット": "emergency_blanket.webp",
    "レインコート": "raincoat.webp",
    "軍手": "gloves.webp",
    "タオル": "towel.webp",
    "防災リュック": "backpack.webp",
    "救急セット": "first_aid.webp",
    "常備薬・処方薬": "medicine.webp",
    "携帯ラジオ": "radio.webp",
    "緊急連絡先メモ": "contact_note.webp",
    "現金・小銭": "cash.webp",
    "乳児用ミルク": "baby_milk.webp",
    "紙おむつ": "diapers.webp",
    "おしりふき": "baby_wipes.webp",
    "哺乳瓶・授乳用品": "baby_bottle.webp",
    "介護用品": "care_products.webp",
    "大人用おむつ": "adult_diapers.webp",
    "ペットフード": "pet_food.webp",
    "ペット用飲料水": "water.webp",
    "ペット用トイレ用品": "pet_toilet.webp",
    "ペット用キャリー": "pet_carrier.webp"
};
// SVG

const BP_ICONS = {
    plus: `
        <svg viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="1.5"
             stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
        </svg>
    `,
    backpack: `
        <svg viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="1.6"
             stroke-linecap="round"
             stroke-linejoin="round">
            <path d="M9 5V4a3 3 0 0 1 6 0v1"/>
            <rect x="5"
                  y="5"
                  width="14"
                  height="17"
                  rx="4"/>
            <rect x="8"
                  y="13"
                  width="8"
                  height="6"
                  rx="1"/>
            <path d="M8 9h8"/>
        </svg>
    `,
    image: `
        <svg viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="1.5"
             stroke-linecap="round"
             stroke-linejoin="round">
            <rect x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"/>
            <circle cx="8.5"
                    cy="8.5"
                    r="1.5"/>
            <path d="m21 15-5-5L5 21"/>
        </svg>
    `
};
// 基本関数

function bpById(id) {
    return document.getElementById(id);
}


function bpIsImageUrlValid(value) {
    if (!value) return true;
    try {
        return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
        return false;
    }
}


function bpNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function bpFormat(value) {
    return Number(value).toLocaleString( "ja-JP", { maximumFractionDigits: 6 } );
}

function bpSetText(id, value) {
    const element = bpById(id);
    if (element) {
        element.textContent = value;
    }
}

function bpSetProgress(id, value, limit) {
    const element = bpById(id);
    if (!element) {
        return;
    }
    const percentage = limit > 0 ? value / limit * 100 : 0;
    element.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    element.classList.toggle( "is-over", percentage > 100 );
}

function bpElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}
// 画像表示

function bpGetCommonImage(itemName) {
    const filename = BP_ITEM_IMAGES[itemName];
    if (!filename) {
        return "";
    }
    return `/static/images/items/${filename}`;
}

function bpRenderImage(
    container,
    imageUrl,
    fallbackUrl,
    alt
) {
    container.replaceChildren();
    const urls = [ ...new Set( [imageUrl, fallbackUrl].filter(Boolean) ) ];
    let index = 0;
    function showFallback() {
        const fallback = bpElement( "div", "bp-image-fallback" );
        fallback.innerHTML = BP_ICONS.image;
        fallback.append( bpElement( "span", "", "画像準備中" ) );
        container.replaceChildren(fallback);
    }
    function loadNextImage() {
        if (index >= urls.length) {
            showFallback();
            return;
        }
        const img = document.createElement("img");
        img.alt = alt;
        img.loading = "lazy";
        img.addEventListener( "error", loadNextImage, { once: true } );
        container.replaceChildren(img);
        img.src = urls[index];
        index += 1;
    }
    loadNextImage();
}

function bpGetSelectedBag() {
    return bpBags.find( bag => bag.id === bpSelectedBag );
}
// 収納用品

function bpGetItemLots(itemId) {
    const bag = bpGetSelectedBag();
    if (!bag) {
        return [];
    }
    return bag.lots.filter( lot => String(lot.itemId) === String(itemId) );
}

function bpGetItemQuantity(itemId) {
    return bpGetItemLots(itemId).reduce( (total, lot) => total + bpNumber(lot.quantity), 0 );
}
// 重量・容量の概算

function bpGetUnitMeasure(item, type) {
    const required = bpNumber(item.go_required);
    const total = type === "weight" ? item.go_weight : item.go_volume;
    if (
        required <= 0 || total === null || total === undefined
    ) {
        return null;
    }
    return bpLotRound(Number(total) / required);
}

function bpCalculateBag(bag) {
    let weight = bpNumber(bag.baseWeight);
    let volume = 0;
    let unknownWeight = bag.baseWeight === null || bag.baseWeight === undefined ? 1 : 0;
    let unknownVolume = 0;
    for (const lot of bag.lots || []) {
        const item = bpLotGetItem(lot.itemId);
        const quantity = bpNumber(lot.quantity);
        const unitWeight = bpLotGetMeasure( lot, item, "weight" );
        const unitVolume = bpLotGetMeasure( lot, item, "volume" );
        if (unitWeight === null) {
            unknownWeight++;
        } else {
            weight += quantity * unitWeight;
        }
        if (unitVolume === null) {
            unknownVolume++;
        } else {
            volume += quantity * unitVolume;
        }
    }
    return {
        weight: bpLotRound(weight),
        volume: bpLotRound(volume),
        unknownWeight,
        unknownVolume
    };
}

function bpRenderMetrics() {
    const total = bpItems.length;
    const completed = bpItems.filter( item => bpLotHouseholdQuantity(item) >= bpNumber(item.go_required) ).length;
    bpSetText( "bp-completed", completed );
    bpSetText(
        "bp-required-types",
        `/ ${total}種類`
    );
    bpSetText(
        "bp-shortage",
        `残り${total - completed}種類`
    );
    bpSetProgress( "bp-preparation-progress", completed, total );
    const lots = bpLotAllLots();
    const expired = lots.filter( lot => bpLotStatus(lot) === "expired" ).length;
    const expiring = lots.filter( lot => bpLotStatus(lot) === "soon" ).length;
    const unknown = lots.filter( lot => bpLotStatus(lot) === "unknown" ).length;
    bpSetText("bp-expired", expired);
    bpSetText("bp-expiring", expiring);
    bpSetText("bp-unknown", unknown);
}

function bpRenderTabs() {
    const container = bpById("bp-tabs");
    if (!container) {
        return;
    }
    container.replaceChildren();
    for (const bag of bpBags) {
        const button = bpElement( "button", "bp-tab" );
        button.type = "button";
        button.classList.toggle( "is-active", bag.id === bpSelectedBag );
        button.innerHTML = BP_ICONS.backpack;
        button.append( bpElement("span", "", bag.name) );
        button.addEventListener("click", () => { bpSelectedBag = bag.id; bpSelectedItem = null; bpRender(); });
        container.append(button);
    }
}

function bpRenderBag() {
    const bag = bpGetSelectedBag();
    if (!bag) {
        return;
    }
    bpSetText( "bp-bag-name", bag.name );
    bpSetText(
        "bp-bag-capacity",
        `${bpFormat(bag.capacity)}L リュック`
    );
    bpSetText(
        "bp-bag-base-weight",
        bag.baseWeight === null
            ? "本体重量 未登録"
            : `本体重量 ${bpFormat( bag.baseWeight * 1000 )}g`
    );
    const imageContainer = bpById("bp-bag-image");
    bpRenderImage( imageContainer, bag.imageUrl, "/static/images/items/backpack.webp", bag.name );
    const meta = bpById("bp-bag-meta");
    meta.textContent = [bag.owner && `使用者：${bag.owner}`, bag.location && `保管場所：${bag.location}`].filter(Boolean).join(" ｜ ");
    meta.hidden = !meta.textContent;
    const result = bpCalculateBag(bag);
    const weightElement = bpById("bp-weight");
    const volumeElement = bpById("bp-volume");
    bpSetText( "bp-weight", result.unknownWeight > 0 && result.weight === 0 ? "-" : bpFormat(result.weight) );
    bpSetText(
        "bp-weight-limit",
        `/ ${bpFormat(bag.maxWeight)}kg`
    );
    bpSetText( "bp-volume", bpFormat(result.volume) );
    bpSetText(
        "bp-volume-limit",
        `/ ${bpFormat(bag.capacity)}L`
    );
    bpSetProgress( "bp-weight-progress", result.weight, bag.maxWeight );
    bpSetProgress( "bp-volume-progress", result.volume, bag.capacity );
    weightElement.classList.toggle( "is-over", result.weight > bag.maxWeight );
    volumeElement.classList.toggle( "is-over", result.volume > bag.capacity );
    bpSetText(
        "bp-weight-note",
        result.unknownWeight > 0
            ? `重量未確認 ${result.unknownWeight}件`
            : `残り ${bpFormat( bag.maxWeight - result.weight )}kg`
    );
    bpSetText(
        "bp-volume-note",
        result.unknownVolume > 0
            ? `容量未確認 ${result.unknownVolume}件`
            : `残り ${bpFormat( bag.capacity - result.volume )}L`
    );
}

function bpCreateItemCard(item) {
    const quantity = bpGetItemQuantity(item.id);
    const lots = bpGetItemLots(item.id);
    const card = bpElement( "button", "bp-item-card" );
    card.type = "button";
    card.classList.toggle( "is-empty", quantity <= 0 );
    card.classList.toggle( "is-selected", String(bpSelectedItem) === String(item.id) );
    const image = bpElement( "div", "bp-item-image" );
    // 既存のカテゴリデザインを取得
    const design = getCategoryDesign(item.category);
    // カテゴリキーをカードに設定
    card.dataset.category = design.key;
    if (quantity > 0) {
        const productImage = lots.find( lot => lot.imageUrl )?.imageUrl || "";
        bpRenderImage( image, productImage, bpGetCommonImage(item.name), item.name );
    } else {
        const empty = bpElement( "div", "bp-item-empty" );
        empty.innerHTML = BP_ICONS.plus;
        image.append(empty);
    }
    const name = bpElement( "div", "bp-item-name", item.name );
    const quantityLabel = bpElement(
        "div",
        "bp-item-quantity",
        quantity > 0
            ? `${bpFormat(quantity)}${item.unit}`
            : "未収納"
    );
    card.append( image, name, quantityLabel );
    const expired = lots.some(lot => bpLotStatus(lot) === "expired");
    const soon = lots.some(lot => bpLotStatus(lot) === "soon");
    card.classList.toggle("has-expired", expired);
    card.classList.toggle("has-expiring", !expired && soon);
    if (expired || soon) card.title = expired ? "期限切れの商品が含まれています。" : "期限間近の商品が含まれています。";
    card.addEventListener("click", () => {
        bpSelectedItem = String(item.id);
        bpManagementReturnItemId = null;
        if (lots.length) bpOpenItemManagement(item.id);
        else bpOpenLotDialog("add", item.id);
    });
    return card;
}

function bpRenderItems() {
    const container = bpById("bp-items");
    container.replaceChildren();
    // リュック本体は収納用品に含めない
    const items = bpItems.filter( item => item.name !== "防災リュック" );
    let packedCount = 0;
    for (const item of items) {
        if (bpGetItemQuantity(item.id) > 0) {
            packedCount++;
        }
        container.append( bpCreateItemCard(item) );
    }
    bpSetText(
        "bp-item-count",
        `${packedCount}種類収納済み`
    );
}

function bpRenderUnassigned() {
    const container = bpById( "bp-unassigned-items" );
    container.replaceChildren();
    let count = 0;
    for (const item of bpItems) {
        if (item.name === "防災リュック") {
            continue;
        }
        const quantity = bpLotUnassignedQuantity(item);
        if (quantity <= 0) {
            continue;
        }
        count++;
        const row = bpElement( "div", "bp-unassigned-row" );
        row.append(
            bpElement( "span", "", item.name ),
            bpElement(
                "strong",
                "",
                `${bpFormat(quantity)}${item.unit}`
            )
        );
        container.append(row);
    }
    bpSetText(
        "bp-unassigned-count",
        `${count}種類`
    );
    if (count === 0) {
        container.append( bpElement( "p", "bp-detail-note", "未収納用品はありません。" ) );
    }
}

const BP_STORAGE_KEY = "disaster_builder_backpacks_v1";

let bpDefaultCapacity = 30;

let bpDefaultMaxWeight = 10;

let bpEditingBagId = null;
// 保存データ

function bpLoadBags() {
    const raw = localStorage.getItem(BP_STORAGE_KEY);
    if (raw === null) {
        return null;
    }
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
        throw new Error("リュック保存データが不正です。");
    }
    return data;
}

function bpSaveBags(bags) {
    bags = bags.map(bag => ({...bag, history: bag.history ?? bpBags.find(old => old.id === bag.id)?.history ?? []}));
    localStorage.setItem( BP_STORAGE_KEY, JSON.stringify(bags) );
    bpBags = bags;
}

function bpNewBagId() {
    if (window.crypto?.randomUUID) {
        return crypto.randomUUID();
    }
    return `bag-${Date.now()}-${Math.random() .toString(36).slice(2)}`;
}

function bpCreatePreviewBags(result) {
    bpDefaultCapacity = bpNumber(result.backpack_capacity) || 30;
    bpDefaultMaxWeight = bpNumber(result.max_carry_weight) || 10;
    const saved = bpLoadBags();
    if (saved !== null) {
        return saved;
    }
    return [
        {
            id: "preview-bag",
            name: "防災リュック（仮）",
            owner: "",
            location: "",
            capacity: bpDefaultCapacity,
            maxWeight: bpDefaultMaxWeight,
            baseWeight: null,
            imageUrl: "",
            isPreview: true,
            lots: []
        }
    ];
}

function bpShowFormError(message) {
    const element = bpById("bp-form-error");
    element.textContent = message;
    element.hidden = !message;
}

function bpOpenBagDialog(mode) {
    const bag = mode === "edit" ? bpGetSelectedBag() : null;
    if (mode === "edit" && !bag) {
        return;
    }
    bpEditingBagId = bag?.id ?? null;
    bpById("bp-bag-form").reset();
    bpShowFormError("");
    bpSetText( "bp-dialog-title", bag ? "リュック編集" : "リュック登録" );
    bpById("bp-form-name").value = bag?.isPreview ? "防災リュック" : bag?.name || "";
    bpById("bp-form-owner").value = bag?.owner || "";
    bpById("bp-form-location").value = bag?.location || "";
    bpById("bp-form-capacity").value = bag?.capacity ?? bpDefaultCapacity;
    bpById("bp-form-limit").value = bag?.maxWeight ?? bpDefaultMaxWeight;
    bpById("bp-form-weight").value = bag?.baseWeight ?? "";
    bpById("bp-form-image").value = bag?.imageUrl || "";
    bpById("bp-delete-bag").hidden = !bag || bag.isPreview === true;
    bpSetText( "bp-save-bag", bag && !bag.isPreview ? "保存する" : "登録する" );
    bpById("bp-bag-dialog").showModal();
}

function bpCloseBagDialog() {
    bpById("bp-bag-dialog").close();
    bpEditingBagId = null;
}
// 登録・編集

function bpSubmitBag(event) {
    event.preventDefault();
    bpShowFormError("");
    const name = bpById("bp-form-name") .value.trim();
    const owner = bpById("bp-form-owner") .value.trim();
    const location = bpById("bp-form-location") .value.trim();
    const capacity = Number( bpById("bp-form-capacity").value );
    const maxWeight = Number( bpById("bp-form-limit").value );
    const weightValue = bpById("bp-form-weight") .value.trim();
    const baseWeight = weightValue === "" ? null : Number(weightValue);
    const imageUrl = bpById("bp-form-image") .value.trim();
    // 入力チェック
    if (!name) {
        bpShowFormError( "リュック名称を入力してください。" );
        return;
    }
    if (
        !Number.isFinite(capacity) || capacity <= 0 || capacity > 1000
    ) {
        bpShowFormError( "容量を正しく入力してください。" );
        return;
    }
    if (
        !Number.isFinite(maxWeight) || maxWeight <= 0 || maxWeight > 500
    ) {
        bpShowFormError( "重量上限を正しく入力してください。" );
        return;
    }
    if (
        baseWeight !== null && ( !Number.isFinite(baseWeight) || baseWeight < 0 )
    ) {
        bpShowFormError( "本体重量を正しく入力してください。" );
        return;
    }
    if (!bpIsImageUrlValid(imageUrl)) {
        bpShowFormError("有効な画像URLを入力してください。");
        return;
    }
    const existing = bpBags.find( bag => bag.id === bpEditingBagId );
    const now = new Date().toISOString();
    const bag = {
        id: existing && !existing.isPreview ? existing.id : bpNewBagId(),
        name,
        owner,
        location,
        capacity,
        maxWeight,
        baseWeight,
        imageUrl,
        isPreview: false,
        lots: existing?.lots || [],
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };
    // 仮リュックは正式登録時に置き換える
    let nextBags = bpBags.filter( entry => entry.id !== bpEditingBagId && !entry.isPreview );
    if (existing && !existing.isPreview) {
        nextBags = bpBags.map( entry => entry.id === existing.id ? bag : entry );
    } else {
        nextBags.push(bag);
    }
    try {
        bpSaveBags(nextBags);
        bpSelectedBag = bag.id;
        bpSelectedItem = null;
        bpCloseBagDialog();
        bpRender();
    } catch (error) {
        bpShowFormError(
            `保存に失敗しました：${error.message}`
        );
    }
}
// リュック削除

function bpDeleteBag() {
    const bag = bpBags.find( entry => entry.id === bpEditingBagId );
    if (!bag || bag.isPreview) {
        return;
    }
    // 収納用品がある場合は削除不可
    if (bag.lots.length > 0) {
        bpShowFormError( "収納用品が残っています。" + "収納用品を移動してから削除してください。" );
        return;
    }
    const confirmed = window.confirm(
        `「${bag.name}」を削除しますか？`
    );
    if (!confirmed) {
        return;
    }
    const nextBags = bpBags.filter( entry => entry.id !== bag.id );
    try {
        bpSaveBags(nextBags);
        bpSelectedBag = bpBags[0]?.id || null;
        bpSelectedItem = null;
        bpCloseBagDialog();
        bpRender();
    } catch (error) {
        bpShowFormError(
            `削除に失敗しました：${error.message}`
        );
    }
}

function bpInitBagManagement() {
    const addButton = bpById("bp-add-bag");
    if (!addButton) {
        return;
    }
    if (addButton.dataset.initialized === "true") {
        return;
    }
    addButton.dataset.initialized = "true";
    addButton.addEventListener( "click", () => bpOpenBagDialog("add") );
    bpById("bp-edit-bag") .addEventListener( "click", () => bpOpenBagDialog("edit") );
    bpById("bp-cancel-bag") .addEventListener( "click", bpCloseBagDialog );
    bpById("bp-delete-bag") .addEventListener( "click", bpDeleteBag );
    bpById("bp-bag-form") .addEventListener( "submit", bpSubmitBag );
}

let bpLotEditState = null;
// 基本関数

function bpLotRound(value) {
    return Math.round(Number(value) * 1000000) / 1000000;
}

function bpLotToday(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String( date.getMonth() + 1 ).padStart(2, "0");
    const day = String( date.getDate() ).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function bpLotFormatDate(value) {
    return value ? value.replaceAll("-", "/") : "未登録";
}

function bpLotOptionalNumber(id) {
    const value = bpById(id).value.trim();
    return value === "" ? null : Number(value);
}

function bpLotGetItem(itemId) {
    return bpItems.find( item => String(item.id) === String(itemId) );
}

function bpLotShowError(message) {
    const element = bpById("bp-lot-error");
    element.textContent = message;
    element.hidden = !message;
}
// 使用期限

function bpLotStatus(lot) {
    if (lot.expiryMode === "none") {
        return "valid";
    }
    if (
        lot.expiryMode !== "date" || !lot.expiry
    ) {
        return "unknown";
    }
    if (lot.expiry < bpLotToday()) {
        return "expired";
    }
    if (lot.expiry <= bpLotToday(30)) {
        return "soon";
    }
    return "valid";
}

function bpLotStatusLabel(lot) {
    const status = bpLotStatus(lot);
    if (status === "expired") {
        return "期限切れ";
    }
    if (status === "soon") {
        return "期限間近";
    }
    if (status === "unknown") {
        return "期限未確認";
    }
    if (lot.expiryMode === "none") {
        return "期限なし";
    }
    return "期限内";
}
// 全リュックの収納数量

function bpLotAllLots(itemId = null) {
    const lots = bpBags .filter(bag => !bag.isPreview) .flatMap(bag => bag.lots || []);
    if (itemId === null) {
        return lots;
    }
    return lots.filter( lot => String(lot.itemId) === String(itemId) );
}

function bpLotAllValidQuantity(itemId) {
    return bpLotRound(
        bpLotAllLots(itemId) .filter( lot => bpLotStatus(lot) !== "expired" ) .reduce(
                (sum, lot) =>
                    sum + bpNumber(lot.quantity),
                0
            )
    );
}
// 家庭全体の数量
//
// 既存の未収納用品と新規登録品を区別

function bpLotUnassignedQuantity(item) {
    const assignedExisting = bpLotAllLots(item.id) .filter( lot => lot.source === "existing-go" ) .reduce(
            (sum, lot) =>
                sum + bpNumber(lot.quantity),
            0
        );
    return Math.max( 0, bpLotRound( bpNumber(item.go_owned) - assignedExisting ) );
}

function bpLotHouseholdQuantity(item) {
    if (item.name === "防災リュック") {
        return bpBags.filter( bag => !bag.isPreview ).length;
    }
    return bpLotRound( bpLotUnassignedQuantity(item) + bpLotAllValidQuantity(item.id) );
}
// 重量・容量

function bpLotGetMeasure(lot, item, type) {
    const key = type === "weight" ? "unitWeightKg" : "unitVolumeL";
    if (
        Object.prototype.hasOwnProperty.call( lot, key )
    ) {
        const value = lot[key];
        if (value === null || value === "") {
            return null;
        }
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : null;
    }
    return item ? bpGetUnitMeasure(item, type) : null;
}

function bpLotUpdateEstimate() {
    const quantity = bpNumber( bpById("bp-lot-quantity").value );
    const weight = bpLotOptionalNumber( "bp-lot-weight" );
    const volume = bpLotOptionalNumber( "bp-lot-volume" );
    bpSetText(
        "bp-lot-total-weight",
        weight === null ? "不明" : `${bpFormat(quantity * weight)} kg`
    );
    bpSetText(
        "bp-lot-total-volume",
        volume === null ? "不明" : `${bpFormat(quantity * volume)} L`
    );
}

function bpOpenLotDialog(
    mode,
    itemId,
    lotId = null
) {
    const bag = bpGetSelectedBag();
    const item = bpLotGetItem(itemId);
    if (!bag || !item) {
        return;
    }
    if (bag.isPreview) {
        window.alert( "先にリュック本体を正式登録してください。" );
        bpOpenBagDialog("edit");
        return;
    }
    const lot = lotId ? bag.lots.find( entry => entry.id === lotId ) : null;
    if (mode !== "add" && !lot) {
        return;
    }
    bpLotEditState = { mode, bagId: bag.id, itemId: String(item.id), lotId };
    const isConsume = mode === "consume";
    bpById("bp-lot-form").reset();
    bpLotShowError("");
    bpSetText(
        "bp-lot-dialog-title",
        mode === "add"
            ? `${item.name}を登録`
            : mode === "edit"
                ? `${item.name}を編集`
                : `${item.name}を消費・廃棄`
    );
    bpSetText( "bp-lot-form-category", item.category );
    bpSetText( "bp-lot-form-item-name", item.name );
    bpSetText(
        "bp-lot-form-required",
        `家庭全体の必要数量：` +
        `${bpFormat(item.go_required)}${item.unit}`
    );
    bpSetText(
        "bp-lot-form-bag-name",
        `収納先：${bag.name}`
    );
    bpRenderImage( bpById("bp-lot-form-image"), lot?.imageUrl || "", bpGetCommonImage(item.name), item.name );
    bpById( "bp-lot-detail-fields" ).hidden = isConsume;
    bpById( "bp-lot-registration-fields" ).hidden = isConsume;
    bpById( "bp-lot-reason-field" ).hidden = !isConsume;
    bpById( "bp-lot-name" ).required = !isConsume;
    bpById("bp-lot-name").value = lot?.name || item.name;
    bpSetText(
        "bp-lot-quantity-label",
        `${isConsume ? "処理数量" : "収納数量"}` +
        `（${item.unit}）`
    );
    const quantityInput = bpById( "bp-lot-quantity" );
    quantityInput.removeAttribute("max");
    quantityInput.value = lot?.quantity ?? 1;
    if (isConsume) {
        quantityInput.max = lot.quantity;
    }
    bpById("bp-lot-purchased").value = lot?.purchased || "";
    bpById("bp-lot-expiry-mode").checked = lot?.expiryMode === "none";
    bpById("bp-lot-expiry").value = lot?.expiry || "";
    bpSetText(
        "bp-lot-weight-label",
        `1${item.unit}あたりの重量（kg）`
    );
    bpSetText(
        "bp-lot-volume-label",
        `1${item.unit}あたりの容量（L）`
    );
    const unitWeight = lot ? bpLotGetMeasure(lot, item, "weight") : bpGetUnitMeasure(item, "weight");
    const unitVolume = lot ? bpLotGetMeasure(lot, item, "volume") : bpGetUnitMeasure(item, "volume");
    bpById("bp-lot-weight").value = unitWeight === null ? "" : bpLotRound(unitWeight);
    bpById("bp-lot-volume").value = unitVolume === null ? "" : bpLotRound(unitVolume);
    bpById("bp-lot-image-url").value = lot?.imageUrl || "";
    bpSetText( "bp-lot-submit", mode === "add" ? "登録する" : mode === "edit" ? "保存する" : "確定する" );
    bpLotUpdateExpiryField();
    bpLotUpdateEstimate();
    const management = bpGetManagementDialog();
    bpManagementReturnItemId = management.open ? String(itemId) : null;
    if (management.open) management.close();
    bpById("bp-lot-dialog").showModal();
}

function bpCloseLotDialog() {
    bpById("bp-lot-dialog").close();
}
// 収納用品の保存

function bpSubmitLot(event) {
    event.preventDefault();
    bpLotShowError("");
    if (!bpLotEditState) {
        return;
    }
    const state = { ...bpLotEditState };
    const quantity = Number( bpById("bp-lot-quantity").value );
    if (
        !Number.isFinite(quantity) || quantity <= 0
    ) {
        bpLotShowError( "数量を正しく入力してください。" );
        return;
    }
    // 保存に成功するまでは既存データを変更しない
    const nextBags = JSON.parse( JSON.stringify(bpBags) );
    const bag = nextBags.find( entry => entry.id === state.bagId );
    if (!bag || bag.isPreview) {
        bpLotShowError( "収納先のリュックが見つかりません。" );
        return;
    }
    const index = bag.lots.findIndex( lot => lot.id === state.lotId );
    const existing = index >= 0 ? bag.lots[index] : null;
    const now = new Date().toISOString();
    // 消費・廃棄
    if (state.mode === "consume") {
        if (
            !existing || quantity > bpNumber(existing.quantity)
        ) {
            bpLotShowError( "収納数量を超えています。" );
            return;
        }
        const reason = bpById( "bp-lot-reason" ).value;
        const actionLabel = reason === "discard" ? "廃棄" : "消費";
        if (!window.confirm(
            `${existing.name}を` +
            `${bpFormat(quantity)}` +
            `${bpLotGetItem(state.itemId)?.unit || ""}` +
            `${actionLabel}しますか？`
        )) {
            return;
        }
        const remaining = bpLotRound( bpNumber(existing.quantity) - quantity );
        if (remaining <= 0) {
            bag.lots.splice(index, 1);
        } else {
            existing.quantity = remaining;
            existing.updatedAt = now;
        }
        // 履歴はリュックデータ内に保存
        bpRecordHistory(bag, reason, existing, quantity, now);
    // 新規登録・編集
    } else {
        const name = bpById( "bp-lot-name" ).value.trim();
        const purchased = bpById( "bp-lot-purchased" ).value;
        const expiryMode = bpById("bp-lot-expiry-mode").checked ? "none" : bpById("bp-lot-expiry").value ? "date" : "unknown";
        const expiry = expiryMode === "date" ? bpById("bp-lot-expiry").value : "";
        const unitWeightKg = bpLotOptionalNumber( "bp-lot-weight" );
        const unitVolumeL = bpLotOptionalNumber( "bp-lot-volume" );
        const imageUrl = bpById( "bp-lot-image-url" ).value.trim();
        if (!name) {
            bpLotShowError( "商品名を入力してください。" );
            return;
        }
        if (
            purchased && expiry && expiry < purchased
        ) {
            bpLotShowError( "使用期限が購入日より前になっています。" );
            return;
        }
        for (const value of [
            unitWeightKg,
            unitVolumeL
        ]) {
            if (
                value !== null && ( !Number.isFinite(value) || value < 0 )
            ) {
                bpLotShowError( "重量・容量を正しく入力してください。" );
                return;
            }
        }
        if (!bpIsImageUrlValid(imageUrl)) {
            bpLotShowError("有効な画像URLを入力してください。");
            return;
        }
        if (
            state.mode === "edit" && !existing
        ) {
            bpLotShowError( "編集対象の商品が見つかりません。" );
            return;
        }
        const lot = {
            ...existing,
            id: existing?.id || bpNewBagId(),
            itemId: state.itemId,
            name,
            quantity: bpLotRound(quantity),
            purchased,
            expiryMode,
            expiry,
            unitWeightKg,
            unitVolumeL,
            imageUrl,
            source: existing?.source || "new",
            createdAt: existing?.createdAt || now,
            updatedAt: now
        };
        if (state.mode === "edit") {
            bag.lots[index] = lot;
        } else {
            bag.lots.push(lot);
        }
        bpRecordHistory(bag, state.mode, lot, lot.quantity, now);
    }
    bag.updatedAt = now;
    try {
        bpSaveBags(nextBags);
    } catch (error) {
        bpLotShowError(
            `保存に失敗しました：${error.message}`
        );
        return;
    }
    bpSelectedBag = state.bagId;
    bpSelectedItem = state.itemId;
    bpCloseLotDialog();
}

function bpLotButton(label, callback = null) {
    const button = bpElement( "button", "bp-small-button", label );
    button.type = "button";
    button.disabled = callback === null;
    if (callback) {
        button.addEventListener( "click", callback );
    }
    return button;
}
// 詳細画面用サマリー

function bpLotSummaryCell(label, value) {
    const cell = bpElement( "div", "bp-lot-summary-cell" );
    cell.append( bpElement("span", "", label), bpElement("strong", "", value) );
    return cell;
}
// 登録済み商品行

function bpCreateLotRow(item, lot) {
    const row = bpElement( "div", "bp-lot-row" );
    const info = bpElement( "div", "bp-lot-info" );
    const name = bpElement( "div", "bp-lot-product-name", lot.name );
    const meta = bpElement( "div", "bp-lot-meta" );
    const status = bpLotStatus(lot);
    const expiryText = lot.expiryMode === "date"
        ? `期限：${bpLotFormatDate(lot.expiry)}`
        : bpLotStatusLabel(lot);
    meta.append(
        bpElement(
            "span",
            "",
            `購入日：${bpLotFormatDate(lot.purchased)}`
        ),
        bpElement(
            "span",
            `bp-lot-${status}`,
            expiryText
        )
    );
    if (
        status === "expired" || status === "soon"
    ) {
        meta.append(
            bpElement(
                "span",
                `bp-lot-${status}`,
                bpLotStatusLabel(lot)
            )
        );
    }
    const measure = bpElement( "div", "bp-lot-meta" );
    const unitWeight = bpLotGetMeasure( lot, item, "weight" );
    const unitVolume = bpLotGetMeasure( lot, item, "volume" );
    const weightText = unitWeight === null
        ? "不明"
        : `${bpFormat( unitWeight * lot.quantity )}kg`;
    const volumeText = unitVolume === null
        ? "不明"
        : `${bpFormat( unitVolume * lot.quantity )}L`;
    measure.append(
        bpElement(
            "span",
            "",
            `重量：${weightText}`
        ),
        bpElement(
            "span",
            "",
            `容量：${volumeText}`
        )
    );
    info.append( name, meta, measure );
    const right = bpElement( "div", "bp-lot-right" );
    const quantity = bpElement(
        "strong",
        "bp-lot-quantity",
        `${bpFormat(lot.quantity)}${item.unit}`
    );
    const actions = bpElement( "div", "bp-lot-actions" );
    actions.append(
        bpLotButton( "消費・廃棄", () => bpOpenLotDialog( "consume", item.id, lot.id ) ),
        bpLotButton( "編集", () => bpOpenLotDialog( "edit", item.id, lot.id ) )
    );
    const remove = bpLotButton("削除", () => bpDeleteLot(item, lot));
    remove.classList.add("bp-delete-button");
    actions.append(remove);
    right.append( quantity, actions );
    row.append( info, right );
    return row;
}

let bpManagementItemId = null;

let bpManagementReturnItemId = null;
// ダイアログ取得

function bpGetManagementDialog() {
    return bpById( "bp-item-management-dialog" );
}

function bpCloseItemManagement() {
    const dialog = bpGetManagementDialog();
    if (dialog?.open) {
        dialog.close();
    }
    bpManagementItemId = null;
    bpSelectedItem = null;
    bpRenderItems();
}
// 管理ダイアログを開く

function bpOpenItemManagement(itemId) {
    const bag = bpGetSelectedBag();
    const item = bpLotGetItem(itemId);
    const dialog = bpGetManagementDialog();
    if (!bag || !item || !dialog) {
        return;
    }
    bpManagementItemId = String(itemId);
    bpSelectedItem = String(itemId);
    bpRenderItemManagement();
    if (!dialog.open) {
        dialog.showModal();
    }
}
// 管理ダイアログ描画

function bpRenderItemManagement() {
    const container = bpById( "bp-item-management-content" );
    const bag = bpGetSelectedBag();
    const item = bpLotGetItem( bpManagementItemId );
    if (!container || !bag || !item) {
        return;
    }
    container.replaceChildren();
    const lots = bpGetItemLots(item.id);
    const quantity = bpGetItemQuantity(item.id);
    const householdQuantity = bpLotHouseholdQuantity(item);
    const required = bpNumber(item.go_required);
    // ヘッダー
    const heading = bpElement( "div", "bp-management-heading" );
    const headingInfo = bpElement("div");
    headingInfo.append(
        bpElement( "h2", "", item.name ),
        bpElement(
            "div",
            "bp-detail-note",
            `収納先：${bag.name}`
        )
    );
    const closeButton = bpElement( "button", "bp-management-close", "×" );
    closeButton.type = "button";
    closeButton.setAttribute( "aria-label", "閉じる" );
    closeButton.addEventListener( "click", bpCloseItemManagement );
    heading.append( headingInfo, closeButton );
    container.append(heading);
    // 商品画像・収納数量
    const overview = bpElement( "div", "bp-management-overview" );
    const image = bpElement( "div", "bp-management-image" );
    const imageLot = lots.find( lot => lot.imageUrl );
    bpRenderImage( image, imageLot?.imageUrl || "", bpGetCommonImage(item.name), item.name );
    const summary = bpElement( "div", "bp-management-summary" );
    const mainQuantity = bpElement( "div", "bp-management-main-quantity" );
    mainQuantity.append(
        bpElement( "span", "", "このリュックの収納数量" ),
        bpElement(
            "strong",
            "",
            `${bpFormat(quantity)}${item.unit}`
        )
    );
    const quantities = bpElement( "div", "bp-management-quantities" );
    quantities.append(
        bpLotSummaryCell(
            "家庭全体の所有数量（有効・暫定）",
            `${bpFormat(householdQuantity)}${item.unit}`
        ),
        bpLotSummaryCell(
            "家庭全体の必要数量",
            `${bpFormat(required)}${item.unit}`
        )
    );
    const progress = bpElement( "div", "bp-progress" );
    const fill = bpElement( "div", "bp-progress-fill" );
    const percentage = required > 0 ? Math.min( 100, householdQuantity / required * 100 ) : 0;
    fill.style.width = `${percentage}%`;
    progress.append(fill);
    summary.append( mainQuantity, quantities, progress );
    overview.append( image, summary );
    container.append(overview);
    // 登録済み商品一覧
    const products = bpElement( "div", "bp-management-products" );
    const listHeading = bpElement( "div", "bp-lot-list-heading" );
    const addButton = bpElement( "button", "bp-management-add", lots.length > 0 ? "＋ 追加登録" : "＋ 新規登録" );
    addButton.type = "button";
    addButton.addEventListener( "click", () => bpOpenLotDialog( "add", item.id ) );
    listHeading.append(
        bpElement(
            "strong",
            "",
            `登録済み商品（${lots.length}件）`
        ),
        addButton
    );
    products.append(listHeading);
    // 登録済み商品の表示
    if (lots.length === 0) {
        products.append( bpElement( "p", "bp-detail-note", "このリュックにはまだ収納されていません。" ) );
    } else {
        const sortedLots = [...lots].sort(
            (a, b) =>
                (a.expiry || "9999-12-31") .localeCompare( b.expiry || "9999-12-31" )
        );
        for (const lot of sortedLots) {
            const row = bpCreateLotRow( item, lot );
            const actions = row.querySelector( ".bp-lot-actions" );
            if (actions) {
                // 後続STEPで有効化
                actions.prepend( bpLotButton("収納先変更") );
            }
            products.append(row);
        }
    }
    container.append(products);
    // 期限管理の注意表示
    const expiredQuantity = lots .filter( lot => bpLotStatus(lot) === "expired" ) .reduce(
            (sum, lot) =>
                sum + bpNumber(lot.quantity),
            0
        );
    const unknownQuantity = lots .filter( lot => bpLotStatus(lot) === "unknown" ) .reduce(
            (sum, lot) =>
                sum + bpNumber(lot.quantity),
            0
        );
    const notices = [];
    if (expiredQuantity > 0) {
        notices.push(
            `期限切れ${bpFormat(expiredQuantity)}` +
            `${item.unit}（準備状況の集計対象外）`
        );
    }
    if (unknownQuantity > 0) {
        notices.push(
            `期限未確認${bpFormat(unknownQuantity)}` +
            `${item.unit}（暫定集計）`
        );
    }
    if (notices.length > 0) {
        container.append( bpElement( "div", "bp-lot-notice", notices.join("・") ) );
    }
    // フッター
    const footer = bpElement( "div", "bp-management-footer" );
    const footerClose = bpLotButton( "閉じる", bpCloseItemManagement );
    footerClose.classList.add( "bp-management-footer-close" );
    footer.append( bpLotButton("自宅備蓄から移動"), bpLotButton("商品を探す"), footerClose );
    container.append(footer);
}

function bpManagementHandleLotClose() {
    bpLotEditState = null;
    bpRender();
    const returnItemId = bpManagementReturnItemId;
    bpManagementReturnItemId = null;
    if (returnItemId !== null) {
        const lots = bpGetItemLots(returnItemId);
        if (lots.length > 0) {
            // 登録・編集・部分消費後は
            // 最新データで管理画面を再表示
            bpOpenItemManagement( returnItemId );
            return;
        }
    }
    // 全数量を消費・廃棄した場合、
    // または直接新規登録した場合は
    // リュック構成画面に戻る
    bpManagementItemId = null;
    bpSelectedItem = null;
    bpRenderItems();
}
// イベント登録

function bpInitItemManagement() {
    const dialog = bpGetManagementDialog();
    const lotDialog = bpById( "bp-lot-dialog" );
    if (!dialog || !lotDialog) {
        return;
    }
    if (dialog.dataset.initialized === "true") {
        return;
    }
    dialog.dataset.initialized = "true";
    dialog.addEventListener( "cancel", function (event) { event.preventDefault(); bpCloseItemManagement(); } );
    lotDialog.addEventListener( "close", bpManagementHandleLotClose );
}

function bpLotUpdateExpiryField() {
    const none = bpById("bp-lot-expiry-mode").checked;
    bpById("bp-lot-expiry").disabled = none;
    if (none) bpById("bp-lot-expiry").value = "";
}

function bpRecordHistory(bag, action, lot, quantity, timestamp) {
    if (!Array.isArray(bag.history)) bag.history = [];
    bag.history.push({
        id: bpNewBagId(), action, itemId: String(lot.itemId),
        lotId: lot.id, name: lot.name, quantity, timestamp
    });
}


function bpDeleteLot(item, lot) {
    if (!window.confirm(`「${lot.name}」の登録を削除しますか？（消費・廃棄とは区別されます）`)) return;
    const next = JSON.parse(JSON.stringify(bpBags));
    const bag = next.find(b => b.id === bpSelectedBag);
    if (!bag || !bag.lots.some(l => l.id === lot.id)) return;
    bag.lots = bag.lots.filter(l => l.id !== lot.id);
    bag.updatedAt = new Date().toISOString();
    bpRecordHistory(bag, "delete", lot, lot.quantity, bag.updatedAt);
    try { bpSaveBags(next); } catch (error) { window.alert(`削除に失敗しました：${error.message}`); return; }
    if (bpGetItemLots(item.id).length) bpRenderItemManagement();
    else bpCloseItemManagement();
    bpRender();
}

function bpRender() {
    const bag = bpGetSelectedBag();
    const workspace = bpById("bp-items").closest(".bp-workspace");
    workspace.hidden = !bag;
    const empty = bpById("bp-no-bags");
    empty.hidden = Boolean(bag);
    bpRenderTabs();
    bpById("bp-add-bag").disabled = false;
    bpById("bp-edit-bag").disabled = !bag;
    if (bag) { bpRenderBag(); bpRenderItems(); }
    bpRenderUnassigned();
    bpRenderMetrics();
}

function bpInitLotManagement() {
    const form = bpById("bp-lot-form");
    if (!form) {
        return;
    }
    if (form.dataset.initialized === "true") {
        return;
    }
    form.dataset.initialized = "true";
    form.addEventListener( "submit", bpSubmitLot );
    bpById("bp-lot-cancel") .addEventListener( "click", bpCloseLotDialog );
    bpById("bp-lot-expiry-mode") .addEventListener( "change", bpLotUpdateExpiryField );
    for (const id of [
        "bp-lot-quantity",
        "bp-lot-weight",
        "bp-lot-volume"
    ]) {
        bpById(id) .addEventListener( "input", bpLotUpdateEstimate );
    }
}
// main.js のページ振り分けから呼ばれる互換エントリーポイント。
initBackpack = async function () {
    if (!bpById("bp-items")) return;
    try {
        bpInitBagManagement();
        bpInitLotManagement();
        bpInitItemManagement();
        const result = await fetchCalculation("go", "category");
        bpItems = result.items.filter(item => bpNumber(item.go_required) > 0);
        bpBags = bpCreatePreviewBags(result);
        bpSelectedBag = bpBags[0]?.id || null;
        bpSelectedItem = null;
        bpRender();
    } catch (error) {
        const el = bpById("bp-error");
        el.hidden = false;
        el.textContent = `読み込みに失敗しました：${error.message}`;
        console.error(error);
    }
};
