"use strict";

// ========================================
// 非常持ち出し管理
// ========================================

let bpItems = [];
let bpBags = [];
let bpSelectedBag = null;
let bpSelectedItem = null;


// ========================================
// 共通実写画像
// ========================================

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


// ========================================
// SVG
// ========================================

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


// ========================================
// 基本関数
// ========================================

function bpNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


function bpFormat(value) {

    return Number(value).toLocaleString(
        "ja-JP",
        {
            maximumFractionDigits: 2
        }
    );

}


function bpSetText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


function bpSetProgress(id, value, limit) {

    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    const percentage = limit > 0
        ? value / limit * 100
        : 0;

    element.style.width =
        `${Math.min(100, Math.max(0, percentage))}%`;

    element.classList.toggle(
        "is-over",
        percentage > 100
    );

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


// ========================================
// 画像表示
// ========================================

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

    const urls = [
        ...new Set(
            [imageUrl, fallbackUrl].filter(Boolean)
        )
    ];

    let index = 0;

    function showFallback() {

        const fallback = bpElement(
            "div",
            "bp-image-fallback"
        );

        fallback.innerHTML = BP_ICONS.image;

        fallback.append(
            bpElement(
                "span",
                "",
                "画像準備中"
            )
        );

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

        img.addEventListener(
            "error",
            loadNextImage,
            { once: true }
        );

        container.replaceChildren(img);

        img.src = urls[index];

        index += 1;

    }

    loadNextImage();

}


// ========================================
// 基本画面確認用リュック
//
// 実際の登録データではありません。
// STEP 3で登録済みリュックに置き換えます。
// ========================================

function bpCreatePreviewBags(result) {

    return [

        {
            id: "preview-bag",

            name: "防災リュック（仮）",

            capacity: bpNumber(
                result.backpack_capacity
            ),

            maxWeight: bpNumber(
                result.max_carry_weight
            ),

            baseWeight: null,

            imageUrl: "",

            lots: []
        }

    ];

}


// ========================================
// 選択中のリュック
// ========================================

function bpGetSelectedBag() {

    return bpBags.find(
        bag => bag.id === bpSelectedBag
    );

}


// ========================================
// 収納用品
// ========================================

function bpGetItemLots(itemId) {

    const bag = bpGetSelectedBag();

    if (!bag) {
        return [];
    }

    return bag.lots.filter(

        lot =>
            String(lot.itemId) === String(itemId)

    );

}


function bpGetItemQuantity(itemId) {

    return bpGetItemLots(itemId).reduce(

        (total, lot) =>
            total + bpNumber(lot.quantity),

        0

    );

}


// ========================================
// 重量・容量の概算
// ========================================

function bpGetUnitMeasure(item, type) {

    const required = bpNumber(item.go_required);

    const total = type === "weight"
        ? item.go_weight
        : item.go_volume;

    if (
        required <= 0 ||
        total === null ||
        total === undefined
    ) {

        return null;

    }

    return Number(total) / required;

}


function bpCalculateBag(bag) {

    let weight = bpNumber(bag.baseWeight);
    let volume = 0;

    let unknownWeight =
        bag.baseWeight === null ||
        bag.baseWeight === undefined
            ? 1
            : 0;

    let unknownVolume = 0;

    for (const lot of bag.lots) {

        const item = bpItems.find(

            entry =>
                String(entry.id) === String(lot.itemId)

        );

        if (!item) {

            unknownWeight++;
            unknownVolume++;
            continue;

        }

        const quantity = bpNumber(lot.quantity);

        const unitWeight =
            lot.unitWeightKg ??
            bpGetUnitMeasure(item, "weight");

        const unitVolume =
            lot.unitVolumeL ??
            bpGetUnitMeasure(item, "volume");

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

        weight,
        volume,
        unknownWeight,
        unknownVolume

    };

}


// ========================================
// 準備状況
// ========================================

function bpRenderMetrics(result) {

    const total = bpItems.length;

    const completed = bpItems.filter(

        item =>
            bpNumber(item.go_owned) >=
            bpNumber(item.go_required)

    ).length;

    bpSetText(
        "bp-completed",
        completed
    );

    bpSetText(
        "bp-required-types",
        `/ ${total}種類`
    );

    bpSetText(
        "bp-shortage",
        `残り${total - completed}種類`
    );

    bpSetProgress(
        "bp-preparation-progress",
        completed,
        total
    );

    // 期限管理は詳細登録機能の実装後に集計

    bpSetText("bp-expired", "-");
    bpSetText("bp-expiring", "-");
    bpSetText("bp-unknown", "-");

}


// ========================================
// リュックタブ
// ========================================

function bpRenderTabs() {

    const container =
        document.getElementById("bp-tabs");

    if (!container) {
        return;
    }

    container.replaceChildren();

    for (const bag of bpBags) {

        const button = bpElement(
            "button",
            "bp-tab"
        );

        button.type = "button";

        button.classList.toggle(
            "is-active",
            bag.id === bpSelectedBag
        );

        button.innerHTML = BP_ICONS.backpack;

        button.append(
            bpElement("span", "", bag.name)
        );

        button.addEventListener("click", () => {

            bpSelectedBag = bag.id;
            bpSelectedItem = null;

            bpRender();

        });

        container.append(button);

    }

}


// ========================================
// リュック画像・重量・容量
// ========================================

function bpRenderBag() {

    const bag = bpGetSelectedBag();

    if (!bag) {
        return;
    }

    bpSetText(
        "bp-bag-name",
        bag.name
    );

    bpSetText(
        "bp-bag-capacity",
        `${bpFormat(bag.capacity)}L リュック`
    );

    bpSetText(

        "bp-bag-base-weight",

        bag.baseWeight === null
            ? "本体重量 未登録"
            : `本体重量 ${bpFormat(
                bag.baseWeight * 1000
            )}g`

    );

    const imageContainer =
        document.getElementById("bp-bag-image");

    bpRenderImage(

        imageContainer,
        bag.imageUrl,
        "/static/images/items/backpack.webp",
        bag.name

    );

    const result = bpCalculateBag(bag);

    const weightElement =
        document.getElementById("bp-weight");

    const volumeElement =
        document.getElementById("bp-volume");

    bpSetText(

        "bp-weight",

        result.unknownWeight > 0 &&
        result.weight === 0
            ? "-"
            : bpFormat(result.weight)

    );

    bpSetText(
        "bp-weight-limit",
        `/ ${bpFormat(bag.maxWeight)}kg`
    );

    bpSetText(
        "bp-volume",
        bpFormat(result.volume)
    );

    bpSetText(
        "bp-volume-limit",
        `/ ${bpFormat(bag.capacity)}L`
    );

    bpSetProgress(
        "bp-weight-progress",
        result.weight,
        bag.maxWeight
    );

    bpSetProgress(
        "bp-volume-progress",
        result.volume,
        bag.capacity
    );

    weightElement.classList.toggle(
        "is-over",
        result.weight > bag.maxWeight
    );

    volumeElement.classList.toggle(
        "is-over",
        result.volume > bag.capacity
    );

    bpSetText(

        "bp-weight-note",

        result.unknownWeight > 0

            ? `重量未確認 ${result.unknownWeight}件`

            : `残り ${bpFormat(
                bag.maxWeight - result.weight
            )}kg`

    );

    bpSetText(

        "bp-volume-note",

        result.unknownVolume > 0

            ? `容量未確認 ${result.unknownVolume}件`

            : `残り ${bpFormat(
                bag.capacity - result.volume
            )}L`

    );

}


// ========================================
// 用品カード
// ========================================

function bpCreateItemCard(item) {

    const quantity =
        bpGetItemQuantity(item.id);

    const lots =
        bpGetItemLots(item.id);

    const card = bpElement(
        "button",
        "bp-item-card"
    );

    card.type = "button";

    card.classList.toggle(
        "is-empty",
        quantity <= 0
    );

    card.classList.toggle(

        "is-selected",

        String(bpSelectedItem) === String(item.id)

    );

    const image = bpElement(
        "div",
        "bp-item-image"
    );

    // 既存のカテゴリデザインを取得
    const design = getCategoryDesign(item.category);

    // カテゴリキーをカードに設定
    card.dataset.category = design.key;

    if (quantity > 0) {

        const productImage = lots.find(
            lot => lot.imageUrl
        )?.imageUrl || "";

        bpRenderImage(

            image,
            productImage,
            bpGetCommonImage(item.name),
            item.name

        );

    } else {

        const empty = bpElement(
            "div",
            "bp-item-empty"
        );

        empty.innerHTML = BP_ICONS.plus;

        image.append(empty);

    }

    const name = bpElement(

        "div",
        "bp-item-name",
        item.name

    );

    const quantityLabel = bpElement(

        "div",
        "bp-item-quantity",

        quantity > 0

            ? `${bpFormat(quantity)}${item.unit}`

            : "未収納"

    );

    card.append(
        image,
        name,
        quantityLabel
    );

    card.addEventListener("click", () => {

        bpSelectedItem =

            String(bpSelectedItem) === String(item.id)

                ? null

                : item.id;

        bpRenderItems();
        bpRenderDetail();

    });

    return card;

}


// ========================================
// 用品一覧
// ========================================

function bpRenderItems() {

    const container =
        document.getElementById("bp-items");

    container.replaceChildren();

    // リュック本体は収納用品に含めない

    const items = bpItems.filter(

        item => item.name !== "防災リュック"

    );

    let packedCount = 0;

    for (const item of items) {

        if (bpGetItemQuantity(item.id) > 0) {
            packedCount++;
        }

        container.append(
            bpCreateItemCard(item)
        );

    }

    bpSetText(

        "bp-item-count",

        `${packedCount}種類収納済み`

    );

}


// ========================================
// 用品詳細
// ========================================

function bpCreateDetailRow(label, value) {

    const row = bpElement(
        "div",
        "bp-detail-row"
    );

    row.append(

        bpElement(
            "span",
            "bp-detail-label",
            label
        ),

        bpElement(
            "strong",
            "",
            value
        )

    );

    return row;

}


function bpCreateActionButton(label) {

    const button = bpElement(
        "button",
        "bp-small-button",
        label
    );

    button.type = "button";

    // 登録・移動機能は後続STEPで実装

    button.disabled = true;

    return button;

}


function bpRenderDetail() {

    const container =
        document.getElementById("bp-item-detail");

    container.replaceChildren();

    const item = bpItems.find(

        entry =>
            String(entry.id) === String(bpSelectedItem)

    );

    if (!item) {

        container.hidden = true;
        return;

    }

    container.hidden = false;

    const heading = bpElement(
        "div",
        "bp-detail-heading"
    );

    const title = bpElement(
        "h3",
        "",
        item.name
    );

    const close = bpElement(
        "button",
        "bp-small-button",
        "閉じる"
    );

    close.type = "button";

    close.addEventListener("click", () => {

        bpSelectedItem = null;

        bpRenderItems();
        bpRenderDetail();

    });

    heading.append(title, close);

    container.append(heading);

    const quantity =
        bpGetItemQuantity(item.id);

    container.append(

        bpCreateDetailRow(

            "収納数量",

            `${bpFormat(quantity)}${item.unit}`

        ),

        bpCreateDetailRow(

            "家庭全体の非常持ち出し所有数量",

            `${bpFormat(item.go_owned)}${item.unit}`

        ),

        bpCreateDetailRow(

            "家庭全体の必要数量",

            `${bpFormat(item.go_required)}${item.unit}`

        )

    );

    const unitWeight =
        bpGetUnitMeasure(item, "weight");

    const unitVolume =
        bpGetUnitMeasure(item, "volume");

    container.append(

        bpCreateDetailRow(

            "重量（1単位あたり・推定）",

            unitWeight === null

                ? "不明"

                : `${bpFormat(unitWeight * 1000)}g`

        ),

        bpCreateDetailRow(

            "容量（1単位あたり・推定）",

            unitVolume === null

                ? "不明"

                : `${bpFormat(unitVolume)}L`

        )

    );

    const actions = bpElement(
        "div",
        "bp-detail-actions"
    );

    if (quantity > 0) {

        actions.append(

            bpCreateActionButton("消費・廃棄"),
            bpCreateActionButton("収納先変更"),
            bpCreateActionButton("編集"),
            bpCreateActionButton("＋ 追加")

        );

    } else {

        container.append(

            bpElement(

                "p",

                "bp-detail-note",

                "このリュックにはまだ収納されていません。"

            )

        );

        actions.append(

            bpCreateActionButton("自宅備蓄から移動"),
            bpCreateActionButton("新規登録"),
            bpCreateActionButton("商品を探す")

        );

    }

    container.append(actions);

}


// ========================================
// 未収納用品
// ========================================

function bpRenderUnassigned() {

    const container =
        document.getElementById(
            "bp-unassigned-items"
        );

    container.replaceChildren();

    let count = 0;

    for (const item of bpItems) {

        if (item.name === "防災リュック") {
            continue;
        }

        const assigned = bpBags.reduce(

            (total, bag) => {

                const quantity = bag.lots

                    .filter(

                        lot =>
                            String(lot.itemId) ===
                            String(item.id)

                    )

                    .reduce(

                        (sum, lot) =>
                            sum + bpNumber(lot.quantity),

                        0

                    );

                return total + quantity;

            },

            0

        );

        const quantity = Math.max(

            0,

            bpNumber(item.go_owned) - assigned

        );

        if (quantity <= 0) {
            continue;
        }

        count++;

        const row = bpElement(
            "div",
            "bp-unassigned-row"
        );

        row.append(

            bpElement(
                "span",
                "",
                item.name
            ),

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

        container.append(

            bpElement(

                "p",

                "bp-detail-note",

                "未収納用品はありません。"

            )

        );

    }

}


// ========================================
// 画面描画
// ========================================

function bpRender() {

    bpRenderTabs();
    bpRenderBag();
    bpRenderItems();
    bpRenderDetail();
    bpRenderUnassigned();

}


// ========================================
// 初期化
//
// main.jsの既存initBackpackを上書き
// ========================================

initBackpack = async function () {

    const root =
        document.getElementById("bp-items");

    if (!root) {
        return;
    }

    try {

        const result = await fetchCalculation(

            "go",
            "category"

        );

        bpItems = result.items.filter(

            item =>
                bpNumber(item.go_required) > 0

        );

        bpBags = bpCreatePreviewBags(result);

        bpSelectedBag = bpBags[0]?.id || null;

        bpSelectedItem = null;

        bpRenderMetrics(result);

        bpRender();

    } catch (error) {

        const errorElement =
            document.getElementById("bp-error");

        errorElement.hidden = false;

        errorElement.textContent =
            `読み込みに失敗しました：${error.message}`;

        console.error(error);

    }

};

// ========================================
// STEP 3
// リュック登録・編集・削除・保存
// ========================================

const BP_STORAGE_KEY =
    "disaster_builder_backpacks_v1";

let bpDefaultCapacity = 30;
let bpDefaultMaxWeight = 10;
let bpEditingBagId = null;


// ========================================
// 保存データ
// ========================================

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

    localStorage.setItem(
        BP_STORAGE_KEY,
        JSON.stringify(bags)
    );

    bpBags = bags;

}


function bpNewBagId() {

    if (window.crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return `bag-${Date.now()}-${Math.random()
        .toString(36).slice(2)}`;

}


// ========================================
// 初期リュック
// ========================================

bpCreatePreviewBags = function (result) {

    bpDefaultCapacity =
        bpNumber(result.backpack_capacity) || 30;

    bpDefaultMaxWeight =
        bpNumber(result.max_carry_weight) || 10;

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

};


// ========================================
// ダイアログ操作
// ========================================

function bpFormElement(id) {

    return document.getElementById(id);

}


function bpShowFormError(message) {

    const element =
        bpFormElement("bp-form-error");

    element.textContent = message;
    element.hidden = !message;

}


function bpOpenBagDialog(mode) {

    const bag = mode === "edit"
        ? bpGetSelectedBag()
        : null;

    if (mode === "edit" && !bag) {
        return;
    }

    bpEditingBagId = bag?.id ?? null;

    bpFormElement("bp-bag-form").reset();

    bpShowFormError("");

    bpSetText(
        "bp-dialog-title",
        bag ? "リュック編集" : "リュック登録"
    );

    bpFormElement("bp-form-name").value =
        bag?.isPreview
            ? "防災リュック"
            : bag?.name || "";

    bpFormElement("bp-form-owner").value =
        bag?.owner || "";

    bpFormElement("bp-form-location").value =
        bag?.location || "";

    bpFormElement("bp-form-capacity").value =
        bag?.capacity ?? bpDefaultCapacity;

    bpFormElement("bp-form-limit").value =
        bag?.maxWeight ?? bpDefaultMaxWeight;

    bpFormElement("bp-form-weight").value =
        bag?.baseWeight ?? "";

    bpFormElement("bp-form-image").value =
        bag?.imageUrl || "";

    bpFormElement("bp-delete-bag").hidden =
        !bag || bag.isPreview === true;

    bpSetText(
        "bp-save-bag",
        bag && !bag.isPreview
            ? "保存する"
            : "登録する"
    );

    bpFormElement("bp-bag-dialog").showModal();

}


function bpCloseBagDialog() {

    bpFormElement("bp-bag-dialog").close();

    bpEditingBagId = null;

}


// ========================================
// 登録・編集
// ========================================

function bpSubmitBag(event) {

    event.preventDefault();

    bpShowFormError("");

    const name =
        bpFormElement("bp-form-name")
            .value.trim();

    const owner =
        bpFormElement("bp-form-owner")
            .value.trim();

    const location =
        bpFormElement("bp-form-location")
            .value.trim();

    const capacity = Number(
        bpFormElement("bp-form-capacity").value
    );

    const maxWeight = Number(
        bpFormElement("bp-form-limit").value
    );

    const weightValue =
        bpFormElement("bp-form-weight")
            .value.trim();

    const baseWeight = weightValue === ""
        ? null
        : Number(weightValue);

    const imageUrl =
        bpFormElement("bp-form-image")
            .value.trim();


    // 入力チェック

    if (!name) {

        bpShowFormError(
            "リュック名称を入力してください。"
        );

        return;

    }

    if (
        !Number.isFinite(capacity) ||
        capacity <= 0 ||
        capacity > 1000
    ) {

        bpShowFormError(
            "容量を正しく入力してください。"
        );

        return;

    }

    if (
        !Number.isFinite(maxWeight) ||
        maxWeight <= 0 ||
        maxWeight > 500
    ) {

        bpShowFormError(
            "重量上限を正しく入力してください。"
        );

        return;

    }

    if (
        baseWeight !== null &&
        (
            !Number.isFinite(baseWeight) ||
            baseWeight < 0
        )
    ) {

        bpShowFormError(
            "本体重量を正しく入力してください。"
        );

        return;

    }

    if (imageUrl) {

        try {

            const url = new URL(imageUrl);

            if (
                url.protocol !== "https:" &&
                url.protocol !== "http:"
            ) {
                throw new Error();
            }

        } catch {

            bpShowFormError(
                "有効な画像URLを入力してください。"
            );

            return;

        }

    }


    const existing = bpBags.find(
        bag => bag.id === bpEditingBagId
    );

    const now = new Date().toISOString();

    const bag = {

        id: existing && !existing.isPreview
            ? existing.id
            : bpNewBagId(),

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

    let nextBags = bpBags.filter(
        entry =>
            entry.id !== bpEditingBagId &&
            !entry.isPreview
    );

    if (existing && !existing.isPreview) {

        nextBags = bpBags.map(
            entry => entry.id === existing.id
                ? bag
                : entry
        );

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


// ========================================
// リュック削除
// ========================================

function bpDeleteBag() {

    const bag = bpBags.find(
        entry => entry.id === bpEditingBagId
    );

    if (!bag || bag.isPreview) {
        return;
    }

    // 収納用品がある場合は削除不可

    if (bag.lots.length > 0) {

        bpShowFormError(
            "収納用品が残っています。" +
            "収納用品を移動してから削除してください。"
        );

        return;

    }

    const confirmed = window.confirm(
        `「${bag.name}」を削除しますか？`
    );

    if (!confirmed) {
        return;
    }

    const nextBags = bpBags.filter(
        entry => entry.id !== bag.id
    );

    try {

        bpSaveBags(nextBags);

        bpSelectedBag =
            bpBags[0]?.id || null;

        bpSelectedItem = null;

        bpCloseBagDialog();

        bpRender();

    } catch (error) {

        bpShowFormError(
            `削除に失敗しました：${error.message}`
        );

    }

}


// ========================================
// 使用者・保管場所の表示
// ========================================

const bpPreviousRenderBag = bpRenderBag;

bpRenderBag = function () {

    const bag = bpGetSelectedBag();

    if (!bag) {
        return;
    }

    bpPreviousRenderBag();

    const description = document.querySelector(
        ".bp-bag-description"
    );

    if (!description) {
        return;
    }

    let meta = document.getElementById(
        "bp-bag-meta"
    );

    if (!meta) {

        meta = bpElement(
            "div",
            "bp-bag-meta"
        );

        meta.id = "bp-bag-meta";

        description.append(meta);

    }

    const parts = [];

    if (bag.owner) {
        parts.push(`使用者：${bag.owner}`);
    }

    if (bag.location) {
        parts.push(`保管場所：${bag.location}`);
    }

    meta.textContent = parts.join(" ｜ ");

    meta.hidden = parts.length === 0;

};


// ========================================
// リュックタブの描画
// ========================================

const bpPreviousRenderTabs = bpRenderTabs;

bpRenderTabs = function () {

    bpPreviousRenderTabs();

    const addButton =
        bpFormElement("bp-add-bag");

    const editButton =
        bpFormElement("bp-edit-bag");

    addButton.disabled = false;

    editButton.disabled =
        !bpGetSelectedBag();

};


// ========================================
// 画面描画
// ========================================

const bpPreviousRender = bpRender;

bpRender = function () {

    const workspace = document
        .getElementById("bp-items")
        .closest(".bp-workspace");

    const bag = bpGetSelectedBag();

    workspace.hidden = !bag;

    let empty = document.getElementById(
        "bp-no-bags"
    );

    if (!empty) {

        empty = bpElement(
            "div",
            "bp-workspace",
            "リュックが登録されていません。" +
            "「＋ リュック追加」から登録してください。"
        );

        empty.id = "bp-no-bags";

        workspace.before(empty);

    }

    empty.hidden = Boolean(bag);

    if (bag) {

        bpPreviousRender();

    } else {

        bpRenderTabs();
        bpRenderUnassigned();

    }

};


// ========================================
// イベント登録
// ========================================

function bpInitBagManagement() {

    const addButton =
        bpFormElement("bp-add-bag");

    if (!addButton) {
        return;
    }

    if (addButton.dataset.initialized === "true") {
        return;
    }

    addButton.dataset.initialized = "true";

    addButton.addEventListener(
        "click",
        () => bpOpenBagDialog("add")
    );

    bpFormElement("bp-edit-bag")
        .addEventListener(
            "click",
            () => bpOpenBagDialog("edit")
        );

    bpFormElement("bp-cancel-bag")
        .addEventListener(
            "click",
            bpCloseBagDialog
        );

    bpFormElement("bp-delete-bag")
        .addEventListener(
            "click",
            bpDeleteBag
        );

    bpFormElement("bp-bag-form")
        .addEventListener(
            "submit",
            bpSubmitBag
        );

}


// ========================================
// 既存初期化処理を拡張
// ========================================

const bpPreviousInitBackpack = initBackpack;

initBackpack = async function () {

    bpInitBagManagement();

    await bpPreviousInitBackpack();

};

// ========================================
// STEP 4
// 収納用品の登録・編集・消費・廃棄
// ========================================

let bpLotEditState = null;


// ========================================
// 基本関数
// ========================================

function bpLotElement(id) {

    return document.getElementById(id);

}


function bpLotRound(value) {

    return Math.round(Number(value) * 1000000)
        / 1000000;

}


function bpLotToday(offset = 0) {

    const date = new Date();

    date.setDate(date.getDate() + offset);

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function bpLotFormatDate(value) {

    return value
        ? value.replaceAll("-", "/")
        : "未登録";

}


function bpLotOptionalNumber(id) {

    const value = bpLotElement(id).value.trim();

    return value === ""
        ? null
        : Number(value);

}


function bpLotGetItem(itemId) {

    return bpItems.find(
        item => String(item.id) === String(itemId)
    );

}


function bpLotShowError(message) {

    const element = bpLotElement("bp-lot-error");

    element.textContent = message;
    element.hidden = !message;

}


// ========================================
// 使用期限
// ========================================

function bpLotStatus(lot) {

    if (lot.expiryMode === "none") {
        return "valid";
    }

    if (
        lot.expiryMode !== "date" ||
        !lot.expiry
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


// ========================================
// 全リュックの収納数量
// ========================================

function bpLotAllLots(itemId = null) {

    const lots = bpBags
        .filter(bag => !bag.isPreview)
        .flatMap(bag => bag.lots || []);

    if (itemId === null) {
        return lots;
    }

    return lots.filter(

        lot =>
            String(lot.itemId) === String(itemId)

    );

}


function bpLotAllQuantity(itemId) {

    return bpLotRound(

        bpLotAllLots(itemId).reduce(

            (sum, lot) =>
                sum + bpNumber(lot.quantity),

            0

        )

    );

}


function bpLotAllValidQuantity(itemId) {

    return bpLotRound(

        bpLotAllLots(itemId)

            .filter(
                lot => bpLotStatus(lot) !== "expired"
            )

            .reduce(

                (sum, lot) =>
                    sum + bpNumber(lot.quantity),

                0

            )

    );

}


// ========================================
// 家庭全体の数量
//
// 既存の未収納用品と新規登録品を区別
// ========================================

function bpLotUnassignedQuantity(item) {

    const assignedExisting = bpLotAllLots(item.id)

        .filter(
            lot => lot.source === "existing-go"
        )

        .reduce(

            (sum, lot) =>
                sum + bpNumber(lot.quantity),

            0

        );

    return Math.max(

        0,

        bpLotRound(
            bpNumber(item.go_owned) -
            assignedExisting
        )

    );

}


function bpLotHouseholdQuantity(item) {

    if (item.name === "防災リュック") {

        return bpBags.filter(
            bag => !bag.isPreview
        ).length;

    }

    return bpLotRound(

        bpLotUnassignedQuantity(item) +
        bpLotAllValidQuantity(item.id)

    );

}


// ========================================
// 重量・容量
// ========================================

function bpLotGetMeasure(lot, item, type) {

    const key = type === "weight"
        ? "unitWeightKg"
        : "unitVolumeL";

    if (
        Object.prototype.hasOwnProperty.call(
            lot,
            key
        )
    ) {

        const value = lot[key];

        if (value === null || value === "") {
            return null;
        }

        const number = Number(value);

        return Number.isFinite(number) &&
               number >= 0
            ? number
            : null;

    }

    return item
        ? bpGetUnitMeasure(item, type)
        : null;

}


// ========================================
// リュックの重量・容量計算
//
// 期限切れ用品も物理的な重量には含める
// ========================================

bpCalculateBag = function (bag) {

    let weight = bpNumber(bag.baseWeight);
    let volume = 0;

    let unknownWeight =
        bag.baseWeight === null ||
        bag.baseWeight === undefined
            ? 1
            : 0;

    let unknownVolume = 0;

    for (const lot of bag.lots || []) {

        const item = bpLotGetItem(lot.itemId);

        const quantity = bpNumber(lot.quantity);

        const unitWeight = bpLotGetMeasure(
            lot,
            item,
            "weight"
        );

        const unitVolume = bpLotGetMeasure(
            lot,
            item,
            "volume"
        );

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

};


// ========================================
// 登録ダイアログ内の重量・容量表示
// ========================================

function bpLotUpdateEstimate() {

    const quantity = bpNumber(
        bpLotElement("bp-lot-quantity").value
    );

    const weight = bpLotOptionalNumber(
        "bp-lot-weight"
    );

    const volume = bpLotOptionalNumber(
        "bp-lot-volume"
    );

    bpSetText(

        "bp-lot-total-weight",

        weight === null
            ? "不明"
            : `${bpFormat(quantity * weight)} kg`

    );

    bpSetText(

        "bp-lot-total-volume",

        volume === null
            ? "不明"
            : `${bpFormat(quantity * volume)} L`

    );

}


function bpLotUpdateExpiryField() {

    const mode = bpLotElement(
        "bp-lot-expiry-mode"
    ).value;

    const isConsume =
        bpLotEditState?.mode === "consume";

    const visible =
        mode === "date" && !isConsume;

    bpLotElement(
        "bp-lot-expiry-field"
    ).hidden = !visible;

    bpLotElement(
        "bp-lot-expiry"
    ).required = visible;

}


// ========================================
// ダイアログを開く
// ========================================

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

        window.alert(
            "先にリュック本体を正式登録してください。"
        );

        bpOpenBagDialog("edit");

        return;

    }

    const lot = lotId

        ? bag.lots.find(
            entry => entry.id === lotId
        )

        : null;

    if (mode !== "add" && !lot) {
        return;
    }

    bpLotEditState = {

        mode,
        bagId: bag.id,
        itemId: String(item.id),
        lotId

    };

    const isConsume = mode === "consume";

    bpLotElement("bp-lot-form").reset();

    bpLotShowError("");

    bpSetText(

        "bp-lot-dialog-title",

        mode === "add"
            ? `${item.name}を登録`
            : mode === "edit"
                ? `${item.name}を編集`
                : `${item.name}を消費・廃棄`

    );

    bpSetText(
        "bp-lot-form-category",
        item.category
    );

    bpSetText(
        "bp-lot-form-item-name",
        item.name
    );

    bpSetText(

        "bp-lot-form-required",

        `家庭全体の必要数量：` +
        `${bpFormat(item.go_required)}${item.unit}`

    );

    bpSetText(

        "bp-lot-form-bag-name",

        `収納先：${bag.name}`

    );

    bpRenderImage(

        bpLotElement("bp-lot-form-image"),

        lot?.imageUrl || "",

        bpGetCommonImage(item.name),

        item.name

    );

    bpLotElement(
        "bp-lot-detail-fields"
    ).hidden = isConsume;

    bpLotElement(
        "bp-lot-registration-fields"
    ).hidden = isConsume;

    bpLotElement(
        "bp-lot-reason-field"
    ).hidden = !isConsume;

    bpLotElement(
        "bp-lot-name"
    ).required = !isConsume;

    bpLotElement("bp-lot-name").value =
        lot?.name || item.name;

    bpSetText(

        "bp-lot-quantity-label",

        `${isConsume ? "処理数量" : "収納数量"}` +
        `（${item.unit}）`

    );

    const quantityInput = bpLotElement(
        "bp-lot-quantity"
    );

    quantityInput.removeAttribute("max");

    quantityInput.value =
        lot?.quantity ?? 1;

    if (isConsume) {

        quantityInput.max = lot.quantity;

    }

    bpLotElement("bp-lot-purchased").value =
        lot?.purchased || "";

    bpLotElement("bp-lot-expiry-mode").value =
        lot?.expiryMode || "unknown";

    bpLotElement("bp-lot-expiry").value =
        lot?.expiry || "";

    bpSetText(

        "bp-lot-weight-label",

        `1${item.unit}あたりの重量（kg）`

    );

    bpSetText(

        "bp-lot-volume-label",

        `1${item.unit}あたりの容量（L）`

    );

    const unitWeight = lot

        ? bpLotGetMeasure(lot, item, "weight")

        : bpGetUnitMeasure(item, "weight");

    const unitVolume = lot

        ? bpLotGetMeasure(lot, item, "volume")

        : bpGetUnitMeasure(item, "volume");

    bpLotElement("bp-lot-weight").value =
        unitWeight ?? "";

    bpLotElement("bp-lot-volume").value =
        unitVolume ?? "";

    bpLotElement("bp-lot-image-url").value =
        lot?.imageUrl || "";

    bpSetText(

        "bp-lot-submit",

        mode === "add"
            ? "登録する"
            : mode === "edit"
                ? "保存する"
                : "確定する"

    );

    bpLotUpdateExpiryField();

    bpLotUpdateEstimate();

    bpLotElement("bp-lot-dialog").showModal();

}


function bpCloseLotDialog() {

    bpLotElement("bp-lot-dialog").close();

    bpLotEditState = null;

}


// ========================================
// 収納用品の保存
// ========================================

function bpSubmitLot(event) {

    event.preventDefault();

    bpLotShowError("");

    if (!bpLotEditState) {
        return;
    }

    const state = { ...bpLotEditState };

    const quantity = Number(

        bpLotElement("bp-lot-quantity").value

    );

    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {

        bpLotShowError(
            "数量を正しく入力してください。"
        );

        return;

    }

    // 保存に成功するまでは既存データを変更しない

    const nextBags = JSON.parse(
        JSON.stringify(bpBags)
    );

    const bag = nextBags.find(

        entry => entry.id === state.bagId

    );

    if (!bag || bag.isPreview) {

        bpLotShowError(
            "収納先のリュックが見つかりません。"
        );

        return;

    }

    const index = bag.lots.findIndex(

        lot => lot.id === state.lotId

    );

    const existing = index >= 0
        ? bag.lots[index]
        : null;

    const now = new Date().toISOString();


    // ====================================
    // 消費・廃棄
    // ====================================

    if (state.mode === "consume") {

        if (
            !existing ||
            quantity > bpNumber(existing.quantity)
        ) {

            bpLotShowError(
                "収納数量を超えています。"
            );

            return;

        }

        const reason = bpLotElement(
            "bp-lot-reason"
        ).value;

        const actionLabel =
            reason === "discard"
                ? "廃棄"
                : "消費";

        if (!window.confirm(

            `${existing.name}を` +
            `${bpFormat(quantity)}` +
            `${bpLotGetItem(state.itemId)?.unit || ""}` +
            `${actionLabel}しますか？`

        )) {
            return;
        }

        const remaining = bpLotRound(

            bpNumber(existing.quantity) - quantity

        );

        if (remaining <= 0) {

            bag.lots.splice(index, 1);

        } else {

            existing.quantity = remaining;
            existing.updatedAt = now;

        }

        // 履歴はリュックデータ内に保存

        if (!Array.isArray(bag.history)) {
            bag.history = [];
        }

        bag.history.push({

            id: bpNewBagId(),

            action: reason,

            itemId: state.itemId,

            lotId: state.lotId,

            name: existing.name,

            quantity,

            timestamp: now

        });


    // ====================================
    // 新規登録・編集
    // ====================================

    } else {

        const name = bpLotElement(
            "bp-lot-name"
        ).value.trim();

        const purchased = bpLotElement(
            "bp-lot-purchased"
        ).value;

        const expiryMode = bpLotElement(
            "bp-lot-expiry-mode"
        ).value;

        const expiry = expiryMode === "date"

            ? bpLotElement("bp-lot-expiry").value

            : "";

        const unitWeightKg = bpLotOptionalNumber(
            "bp-lot-weight"
        );

        const unitVolumeL = bpLotOptionalNumber(
            "bp-lot-volume"
        );

        const imageUrl = bpLotElement(
            "bp-lot-image-url"
        ).value.trim();

        if (!name) {

            bpLotShowError(
                "商品名を入力してください。"
            );

            return;

        }

        if (expiryMode === "date" && !expiry) {

            bpLotShowError(
                "使用期限を入力してください。"
            );

            return;

        }

        if (
            purchased &&
            expiry &&
            expiry < purchased
        ) {

            bpLotShowError(
                "使用期限が購入日より前になっています。"
            );

            return;

        }

        for (const value of [
            unitWeightKg,
            unitVolumeL
        ]) {

            if (
                value !== null &&
                (
                    !Number.isFinite(value) ||
                    value < 0
                )
            ) {

                bpLotShowError(
                    "重量・容量を正しく入力してください。"
                );

                return;

            }

        }

        if (imageUrl) {

            try {

                const url = new URL(imageUrl);

                if (
                    url.protocol !== "https:" &&
                    url.protocol !== "http:"
                ) {
                    throw new Error();
                }

            } catch {

                bpLotShowError(
                    "有効な画像URLを入力してください。"
                );

                return;

            }

        }

        if (
            state.mode === "edit" &&
            !existing
        ) {

            bpLotShowError(
                "編集対象の商品が見つかりません。"
            );

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

        if (!Array.isArray(bag.history)) {
            bag.history = [];
        }

        bag.history.push({

            id: bpNewBagId(),

            action: state.mode,

            itemId: state.itemId,

            lotId: lot.id,

            name: lot.name,

            quantity: lot.quantity,

            timestamp: now

        });

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

    bpRender();

}


// ========================================
// 準備状況・期限管理
// ========================================

bpRenderMetrics = function () {

    const total = bpItems.length;

    const completed = bpItems.filter(

        item =>

            bpLotHouseholdQuantity(item) >=
            bpNumber(item.go_required)

    ).length;

    bpSetText(
        "bp-completed",
        completed
    );

    bpSetText(

        "bp-required-types",

        `/ ${total}種類`

    );

    bpSetText(

        "bp-shortage",

        `残り${total - completed}種類`

    );

    bpSetProgress(

        "bp-preparation-progress",

        completed,

        total

    );

    const lots = bpLotAllLots();

    const expired = lots.filter(

        lot => bpLotStatus(lot) === "expired"

    ).length;

    const expiring = lots.filter(

        lot => bpLotStatus(lot) === "soon"

    ).length;

    const unknown = lots.filter(

        lot => bpLotStatus(lot) === "unknown"

    ).length;

    bpSetText("bp-expired", expired);

    bpSetText("bp-expiring", expiring);

    bpSetText("bp-unknown", unknown);

};


// ========================================
// 収納用品カードの期限表示
// ========================================

const bpStep4PreviousCreateItemCard =
    bpCreateItemCard;

bpCreateItemCard = function (item) {

    const card =
        bpStep4PreviousCreateItemCard(item);

    const lots = bpGetItemLots(item.id);

    const hasExpired = lots.some(

        lot => bpLotStatus(lot) === "expired"

    );

    const hasExpiring = lots.some(

        lot => bpLotStatus(lot) === "soon"

    );

    card.classList.toggle(

        "has-expired",

        hasExpired

    );

    card.classList.toggle(

        "has-expiring",

        !hasExpired && hasExpiring

    );

    if (hasExpired) {

        card.title =
            "期限切れの商品が含まれています。";

    } else if (hasExpiring) {

        card.title =
            "期限間近の商品が含まれています。";

    }

    return card;

};


// ========================================
// 詳細画面用ボタン
// ========================================

function bpLotButton(label, callback = null) {

    const button = bpElement(

        "button",

        "bp-small-button",

        label

    );

    button.type = "button";

    button.disabled = callback === null;

    if (callback) {

        button.addEventListener(
            "click",
            callback
        );

    }

    return button;

}


// ========================================
// 詳細画面用サマリー
// ========================================

function bpLotSummaryCell(label, value) {

    const cell = bpElement(

        "div",

        "bp-lot-summary-cell"

    );

    cell.append(

        bpElement("span", "", label),

        bpElement("strong", "", value)

    );

    return cell;

}


// ========================================
// 登録済み商品行
// ========================================

function bpCreateLotRow(item, lot) {

    const row = bpElement(

        "div",

        "bp-lot-row"

    );

    const info = bpElement(

        "div",

        "bp-lot-info"

    );

    const name = bpElement(

        "div",

        "bp-lot-product-name",

        lot.name

    );

    const meta = bpElement(

        "div",

        "bp-lot-meta"

    );

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
        status === "expired" ||
        status === "soon"
    ) {

        meta.append(

            bpElement(

                "span",

                `bp-lot-${status}`,

                bpLotStatusLabel(lot)

            )

        );

    }

    const measure = bpElement(

        "div",

        "bp-lot-meta"

    );

    const unitWeight = bpLotGetMeasure(

        lot,

        item,

        "weight"

    );

    const unitVolume = bpLotGetMeasure(

        lot,

        item,

        "volume"

    );

    const weightText = unitWeight === null

        ? "不明"

        : `${bpFormat(
            unitWeight * lot.quantity
        )}kg`;

    const volumeText = unitVolume === null

        ? "不明"

        : `${bpFormat(
            unitVolume * lot.quantity
        )}L`;

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

    info.append(

        name,

        meta,

        measure

    );

    const right = bpElement(

        "div",

        "bp-lot-right"

    );

    const quantity = bpElement(

        "strong",

        "bp-lot-quantity",

        `${bpFormat(lot.quantity)}${item.unit}`

    );

    const actions = bpElement(

        "div",

        "bp-lot-actions"

    );

    actions.append(

        bpLotButton(

            "消費・廃棄",

            () => bpOpenLotDialog(

                "consume",

                item.id,

                lot.id

            )

        ),

        bpLotButton(

            "編集",

            () => bpOpenLotDialog(

                "edit",

                item.id,

                lot.id

            )

        )

    );

    right.append(

        quantity,

        actions

    );

    row.append(

        info,

        right

    );

    return row;

}


// ========================================
// 収納用品詳細画面
// ========================================

bpRenderDetail = function () {

    const container = bpLotElement(

        "bp-item-detail"

    );

    container.replaceChildren();

    const item = bpLotGetItem(bpSelectedItem);

    const bag = bpGetSelectedBag();

    if (!item || !bag) {

        container.hidden = true;

        return;

    }

    container.hidden = false;

    const heading = bpElement(

        "div",

        "bp-detail-heading"

    );

    heading.append(

        bpElement(

            "h3",

            "",

            item.name

        ),

        bpLotButton(

            "閉じる",

            () => {

                bpSelectedItem = null;

                bpRenderItems();

                bpRenderDetail();

            }

        )

    );

    container.append(heading);

    const lots = bpGetItemLots(item.id);

    const quantity = bpGetItemQuantity(item.id);

    const householdQuantity =
        bpLotHouseholdQuantity(item);

    const required =
        bpNumber(item.go_required);

    const summary = bpElement(

        "div",

        "bp-lot-summary"

    );

    summary.append(

        bpLotSummaryCell(

            "このリュックの収納数量",

            `${bpFormat(quantity)}${item.unit}`

        ),

        bpLotSummaryCell(

            "家庭全体の所有数量（有効・暫定）",

            `${bpFormat(householdQuantity)}${item.unit}`

        ),

        bpLotSummaryCell(

            "家庭全体の必要数量",

            `${bpFormat(required)}${item.unit}`

        )

    );

    container.append(summary);

    const progress = bpElement(

        "div",

        "bp-progress"

    );

    const fill = bpElement(

        "div",

        "bp-progress-fill"

    );

    fill.style.width =

        `${required > 0

            ? Math.min(

                100,

                householdQuantity / required * 100

            )

            : 0

        }%`;

    progress.append(fill);

    container.append(progress);


    // ====================================
    // 登録済み商品一覧
    // ====================================

    const list = bpElement(

        "div",

        "bp-lot-list"

    );

    const listHeading = bpElement(

        "div",

        "bp-lot-list-heading"

    );

    listHeading.append(

        bpElement(

            "strong",

            "",

            `登録済み商品（${lots.length}件）`

        ),

        bpLotButton(

            lots.length > 0

                ? "＋ 追加登録"

                : "＋ 新規登録",

            () => bpOpenLotDialog(

                "add",

                item.id

            )

        )

    );

    list.append(listHeading);

    if (lots.length === 0) {

        list.append(

            bpElement(

                "p",

                "bp-detail-note",

                "このリュックにはまだ収納されていません。"

            )

        );

    } else {

        const sortedLots = [...lots].sort(

            (a, b) =>

                (a.expiry || "9999-12-31")

                    .localeCompare(

                        b.expiry || "9999-12-31"

                    )

        );

        for (const lot of sortedLots) {

            list.append(

                bpCreateLotRow(item, lot)

            );

        }

    }

    container.append(list);


    // ====================================
    // 期限に関する注意
    // ====================================

    const expiredQuantity = lots

        .filter(

            lot => bpLotStatus(lot) === "expired"

        )

        .reduce(

            (sum, lot) =>
                sum + bpNumber(lot.quantity),

            0

        );

    const unknownQuantity = lots

        .filter(

            lot => bpLotStatus(lot) === "unknown"

        )

        .reduce(

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

        container.append(

            bpElement(

                "div",

                "bp-lot-notice",

                notices.join("・")

            )

        );

    }


    // ====================================
    // 後続STEPで実装する機能
    // ====================================

    const actions = bpElement(

        "div",

        "bp-detail-actions"

    );

    actions.append(

        bpLotButton("収納先変更"),

        bpLotButton("自宅備蓄から移動"),

        bpLotButton("商品を探す")

    );

    container.append(actions);

};


// ========================================
// 未収納用品
//
// 新規登録品によって既存の未収納用品が
// 減らないようにする
// ========================================

bpRenderUnassigned = function () {

    const container = bpLotElement(

        "bp-unassigned-items"

    );

    container.replaceChildren();

    let count = 0;

    for (const item of bpItems) {

        if (item.name === "防災リュック") {
            continue;
        }

        const quantity =

            bpLotUnassignedQuantity(item);

        if (quantity <= 0) {
            continue;
        }

        count++;

        const row = bpElement(

            "div",

            "bp-unassigned-row"

        );

        row.append(

            bpElement(

                "span",

                "",

                item.name

            ),

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

        container.append(

            bpElement(

                "p",

                "bp-detail-note",

                "未収納用品はありません。"

            )

        );

    }

};


// ========================================
// リュック編集時の収納履歴保持
// ========================================

const bpStep4PreviousSaveBags = bpSaveBags;

bpSaveBags = function (bags) {

    const nextBags = bags.map(bag => {

        const existing = bpBags.find(

            entry => entry.id === bag.id

        );

        return {

            ...bag,

            history:

                bag.history ??

                existing?.history ??

                []

        };

    });

    bpStep4PreviousSaveBags(nextBags);

};


// ========================================
// 即時再描画
// ========================================

const bpStep4PreviousRender = bpRender;

bpRender = function () {

    bpStep4PreviousRender();

    bpRenderMetrics();

};


// ========================================
// イベント登録
// ========================================

function bpInitLotManagement() {

    const form = bpLotElement("bp-lot-form");

    if (!form) {
        return;
    }

    if (form.dataset.initialized === "true") {
        return;
    }

    form.dataset.initialized = "true";

    form.addEventListener(

        "submit",

        bpSubmitLot

    );

    bpLotElement("bp-lot-cancel")

        .addEventListener(

            "click",

            bpCloseLotDialog

        );

    bpLotElement("bp-lot-dialog")

        .addEventListener(

            "close",

            () => {

                bpLotEditState = null;

            }

        );

    bpLotElement("bp-lot-expiry-mode")

        .addEventListener(

            "change",

            bpLotUpdateExpiryField

        );

    for (const id of [

        "bp-lot-quantity",

        "bp-lot-weight",

        "bp-lot-volume"

    ]) {

        bpLotElement(id)

            .addEventListener(

                "input",

                bpLotUpdateEstimate

            );

    }

}


// ========================================
// 初期化
// ========================================

const bpStep4PreviousInitBackpack =

    initBackpack;

initBackpack = async function () {

    bpInitLotManagement();

    await bpStep4PreviousInitBackpack();

};

// ========================================
// 未収納カードから直接商品登録
// ========================================

const bpPreviousCreateItemCardDirect =
    bpCreateItemCard;

bpCreateItemCard = function (item) {

    const card =
        bpPreviousCreateItemCardDirect(item);

    card.addEventListener("click", function (event) {

        const lots = bpGetItemLots(item.id);

        // 収納済みの場合は既存の動作を維持
        if (lots.length > 0) {
            return;
        }

        // 未収納の場合は既存のクリック処理を停止
        event.preventDefault();
        event.stopImmediatePropagation();

        bpSelectedItem = String(item.id);

        // 登録ダイアログを直接表示
        bpOpenLotDialog("add", item.id);

    }, true);

    return card;

};

// ========================================
// 収納用品管理ダイアログ
// ========================================

let bpManagementItemId = null;

let bpManagementReturnItemId = null;


// ========================================
// ダイアログ取得
// ========================================

function bpGetManagementDialog() {

    return document.getElementById(
        "bp-item-management-dialog"
    );

}


// ========================================
// 下部詳細パネルの廃止
// ========================================

bpRenderDetail = function () {

    const container = document.getElementById(
        "bp-item-detail"
    );

    if (container) {

        container.hidden = true;

        container.replaceChildren();

    }

};


// ========================================
// 管理ダイアログを閉じる
// ========================================

function bpCloseItemManagement() {

    const dialog = bpGetManagementDialog();

    if (dialog?.open) {

        dialog.close();

    }

    bpManagementItemId = null;

    bpSelectedItem = null;

    bpRenderItems();

}


// ========================================
// 管理ダイアログを開く
// ========================================

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


// ========================================
// 管理ダイアログ描画
// ========================================

function bpRenderItemManagement() {

    const container = document.getElementById(
        "bp-item-management-content"
    );

    const bag = bpGetSelectedBag();

    const item = bpLotGetItem(
        bpManagementItemId
    );

    if (!container || !bag || !item) {

        return;

    }

    container.replaceChildren();

    const lots = bpGetItemLots(item.id);

    const quantity = bpGetItemQuantity(item.id);

    const householdQuantity =
        bpLotHouseholdQuantity(item);

    const required =
        bpNumber(item.go_required);


    // ====================================
    // ヘッダー
    // ====================================

    const heading = bpElement(
        "div",
        "bp-management-heading"
    );

    const headingInfo = bpElement("div");

    headingInfo.append(

        bpElement(
            "h2",
            "",
            item.name
        ),

        bpElement(
            "div",
            "bp-detail-note",
            `収納先：${bag.name}`
        )

    );

    const closeButton = bpElement(
        "button",
        "bp-management-close",
        "×"
    );

    closeButton.type = "button";

    closeButton.setAttribute(
        "aria-label",
        "閉じる"
    );

    closeButton.addEventListener(
        "click",
        bpCloseItemManagement
    );

    heading.append(
        headingInfo,
        closeButton
    );

    container.append(heading);


    // ====================================
    // 商品画像・収納数量
    // ====================================

    const overview = bpElement(
        "div",
        "bp-management-overview"
    );

    const image = bpElement(
        "div",
        "bp-management-image"
    );

    const imageLot = lots.find(
        lot => lot.imageUrl
    );

    bpRenderImage(

        image,

        imageLot?.imageUrl || "",

        bpGetCommonImage(item.name),

        item.name

    );

    const summary = bpElement(
        "div",
        "bp-management-summary"
    );

    const mainQuantity = bpElement(
        "div",
        "bp-management-main-quantity"
    );

    mainQuantity.append(

        bpElement(
            "span",
            "",
            "このリュックの収納数量"
        ),

        bpElement(
            "strong",
            "",
            `${bpFormat(quantity)}${item.unit}`
        )

    );

    const quantities = bpElement(
        "div",
        "bp-management-quantities"
    );

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

    const progress = bpElement(
        "div",
        "bp-progress"
    );

    const fill = bpElement(
        "div",
        "bp-progress-fill"
    );

    const percentage = required > 0

        ? Math.min(
            100,
            householdQuantity / required * 100
        )

        : 0;

    fill.style.width = `${percentage}%`;

    progress.append(fill);

    summary.append(

        mainQuantity,

        quantities,

        progress

    );

    overview.append(

        image,

        summary

    );

    container.append(overview);


    // ====================================
    // 登録済み商品一覧
    // ====================================

    const products = bpElement(
        "div",
        "bp-management-products"
    );

    const listHeading = bpElement(
        "div",
        "bp-lot-list-heading"
    );

    const addButton = bpElement(

        "button",

        "bp-management-add",

        lots.length > 0

            ? "＋ 追加登録"

            : "＋ 新規登録"

    );

    addButton.type = "button";

    addButton.addEventListener(

        "click",

        () => bpOpenLotDialog(
            "add",
            item.id
        )

    );

    listHeading.append(

        bpElement(

            "strong",

            "",

            `登録済み商品（${lots.length}件）`

        ),

        addButton

    );

    products.append(listHeading);


    // ====================================
    // 登録済み商品の表示
    // ====================================

    if (lots.length === 0) {

        products.append(

            bpElement(

                "p",

                "bp-detail-note",

                "このリュックにはまだ収納されていません。"

            )

        );

    } else {

        const sortedLots = [...lots].sort(

            (a, b) =>

                (a.expiry || "9999-12-31")

                    .localeCompare(
                        b.expiry || "9999-12-31"
                    )

        );

        for (const lot of sortedLots) {

            const row = bpCreateLotRow(
                item,
                lot
            );

            const actions = row.querySelector(
                ".bp-lot-actions"
            );

            if (actions) {

                // 後続STEPで有効化

                actions.prepend(

                    bpLotButton("収納先変更")

                );

            }

            products.append(row);

        }

    }

    container.append(products);


    // ====================================
    // 期限管理の注意表示
    // ====================================

    const expiredQuantity = lots

        .filter(

            lot => bpLotStatus(lot) === "expired"

        )

        .reduce(

            (sum, lot) =>
                sum + bpNumber(lot.quantity),

            0

        );

    const unknownQuantity = lots

        .filter(

            lot => bpLotStatus(lot) === "unknown"

        )

        .reduce(

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

        container.append(

            bpElement(

                "div",

                "bp-lot-notice",

                notices.join("・")

            )

        );

    }


    // ====================================
    // フッター
    // ====================================

    const footer = bpElement(

        "div",

        "bp-management-footer"

    );

    const footerClose = bpLotButton(

        "閉じる",

        bpCloseItemManagement

    );

    footerClose.classList.add(

        "bp-management-footer-close"

    );

    footer.append(

        bpLotButton("自宅備蓄から移動"),

        bpLotButton("商品を探す"),

        footerClose

    );

    container.append(footer);

}


// ========================================
// カードクリック処理の変更
// ========================================

const bpManagementPreviousCreateItemCard =

    bpCreateItemCard;

bpCreateItemCard = function (item) {

    const originalCard =

        bpManagementPreviousCreateItemCard(item);

    // 既存のクリックイベントを除去し、
    // 新しいクリック処理に統一する

    const card = originalCard.cloneNode(true);

    card.addEventListener(

        "click",

        function (event) {

            event.preventDefault();

            event.stopPropagation();

            const lots = bpGetItemLots(item.id);

            bpSelectedItem = String(item.id);

            bpManagementReturnItemId = null;

            if (lots.length === 0) {

                // 未収納：直接新規登録

                bpOpenLotDialog(
                    "add",
                    item.id
                );

            } else {

                // 収納済み：管理ダイアログ

                bpOpenItemManagement(
                    item.id
                );

            }

        }

    );

    return card;

};


// ========================================
// 管理画面から登録・編集画面へ移動
// ========================================

const bpManagementPreviousOpenLotDialog =

    bpOpenLotDialog;

bpOpenLotDialog = function (
    mode,
    itemId,
    lotId = null
) {

    const managementDialog =
        bpGetManagementDialog();

    if (managementDialog?.open) {

        // 登録・編集完了後の戻り先を保持

        bpManagementReturnItemId =
            String(itemId);

        managementDialog.close();

    } else {

        bpManagementReturnItemId = null;

    }

    bpManagementPreviousOpenLotDialog(

        mode,

        itemId,

        lotId

    );

    const lotDialog = document.getElementById(
        "bp-lot-dialog"
    );

    // 登録画面を開けなかった場合は管理画面へ戻る

    if (
        !lotDialog?.open &&
        bpManagementReturnItemId !== null
    ) {

        const returnItemId =
            bpManagementReturnItemId;

        bpManagementReturnItemId = null;

        bpOpenItemManagement(returnItemId);

    }

};


// ========================================
// 登録・編集画面を閉じた後の処理
// ========================================

function bpManagementHandleLotClose() {

    const returnItemId =
        bpManagementReturnItemId;

    bpManagementReturnItemId = null;

    if (returnItemId !== null) {

        const lots =
            bpGetItemLots(returnItemId);

        if (lots.length > 0) {

            // 登録・編集・部分消費後は
            // 最新データで管理画面を再表示

            bpOpenItemManagement(
                returnItemId
            );

            return;

        }

    }

    // 全数量を消費・廃棄した場合、
    // または直接新規登録した場合は
    // リュック構成画面に戻る

    bpManagementItemId = null;

    bpSelectedItem = null;

    bpRender();

}


// ========================================
// イベント登録
// ========================================

function bpInitItemManagement() {

    const dialog =
        bpGetManagementDialog();

    const lotDialog = document.getElementById(

        "bp-lot-dialog"

    );

    if (!dialog || !lotDialog) {

        return;

    }

    if (dialog.dataset.initialized === "true") {

        return;

    }

    dialog.dataset.initialized = "true";

    dialog.addEventListener(

        "cancel",

        function (event) {

            event.preventDefault();

            bpCloseItemManagement();

        }

    );

    lotDialog.addEventListener(

        "close",

        bpManagementHandleLotClose

    );

}


// ========================================
// 初期化
// ========================================

const bpManagementPreviousInitBackpack =

    initBackpack;

initBackpack = async function () {

    bpInitItemManagement();

    await bpManagementPreviousInitBackpack();

};