"use strict";


// ========================================
// LocalStorage
// ========================================

const SETTINGS_KEY = "disaster_builder_settings_v1";
const HOME_KEY = "disaster_builder_owned_v1";
const GO_KEY = "disaster_builder_owned_go_v1";
const PRODUCT_KEY = "disaster_builder_products_v1";

const DEFAULT_SETTINGS = {
    adults: 2,
    children: 1,
    pets: 0,
    infants: 0,
    seniors: 0,
    days: 7,
    go_days: 1,
    backpack_capacity: 30,
    max_carry_weight: 10
};

function loadObject(key) {

    try {

        const data = JSON.parse(
            localStorage.getItem(key) || "{}"
        );

        if (
            data &&
            typeof data === "object" &&
            !Array.isArray(data)
        ) {
            return data;
        }

    } catch (error) {

        console.warn(error);
    }

    return {};
}

function saveObject(key, data) {

    localStorage.setItem(
        key,
        JSON.stringify(data)
    );
}

function loadSettings() {

    const saved = loadObject(SETTINGS_KEY);

    const settings = {
        ...DEFAULT_SETTINGS
    };

    Object.keys(settings).forEach(key => {

        const value = saved[key] ?? saved[
            key.replaceAll("_", "-")
        ];

        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            Number.isFinite(Number(value))
        ) {
            settings[key] = Number(value);
        }
    });

    return settings;
}

function loadOwned(key) {

    const result = {};

    Object.entries(loadObject(key))
        .forEach(([id, value]) => {

            const quantity = Number(value);

            if (
                Number.isFinite(quantity) &&
                quantity >= 0
            ) {
                result[id] = quantity;
            }
        });

    return result;
}

function loadSelectedProducts() {

    const result = {};

    Object.entries(loadObject(PRODUCT_KEY))
        .forEach(([id, value]) => {

            const productId = Number(value);

            if (
                Number.isInteger(productId) &&
                productId > 0
            ) {
                result[id] = productId;
            }
        });

    return result;
}

let settings = loadSettings();
let ownedHome = loadOwned(HOME_KEY);
let ownedGo = loadOwned(GO_KEY);
let selectedProducts = loadSelectedProducts();

let storageType = "all";
let sortBy = "category";
let requestSequence = 0;


// ========================================
// 共通処理
// ========================================

function byId(id) {

    return document.getElementById(id);
}

function setText(id, value) {

    const element = byId(id);

    if (element) {
        element.textContent = value;
    }
}

function createElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function format(value) {

    return Number(value).toLocaleString(
        "ja-JP",
        {
            maximumFractionDigits: 2
        }
    );
}

function yen(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "価格未登録";
    }

    return "¥" + format(value);
}

function safeUrl(value) {

    if (!value) return null;

    try {

        const url = new URL(value);

        if (
            url.protocol === "https:" ||
            url.protocol === "http:"
        ) {
            return url.href;
        }

    } catch {
        return null;
    }

    return null;
}

function showError(message) {

    setText("page-error", message);
}

function setProgress(id, value) {

    const element = byId(id);

    if (!element) return;

    element.style.width =
        `${Math.max(0, Math.min(100, value))}%`;

    element.style.background =
        value > 100
            ? "var(--danger)"
            : "var(--primary)";
}


// ========================================
// SVGアイコン
// ========================================

const iconPaths = {

    dashboard:
        "M3 3H10V10H3Z M14 3H21V10H14Z " +
        "M3 14H10V21H3Z M14 14H21V21H14Z",

    builder:
        "M4 6H20 M4 12H20 M4 18H20 " +
        "M8 3V9 M16 9V15 M10 15V21",

    home:
        "M3 10L12 3L21 10V21H3Z " +
        "M9 21V13H15V21",

    bag:
        "M8 5V3H16V5 M5 9Q5 5 12 5 " +
        "Q19 5 19 9V21H5Z M8 13H16V18H8Z",

    calendar:
        "M3 5H21V21H3Z M7 2V8 M17 2V8 " +
        "M3 10H21 M12 13V16L15 18",

    cart:
        "M2 3H5L8 15H19L22 6H6 " +
        "M9 20H9.1 M18 20H18.1",

    history:
        "M3 12A9 9 0 1 0 6 5 " +
        "M3 3V9H9 M12 7V12L16 15",

    settings:
        "M12 8A4 4 0 1 0 12 16 " +
        "A4 4 0 1 0 12 8 " +
        "M12 2V5 M12 19V22 M2 12H5 " +
        "M19 12H22 M5 5L7 7 M17 17L19 19 " +
        "M19 5L17 7 M7 17L5 19",

    box:
        "M3 6L12 2L21 6V18L12 22L3 18Z " +
        "M3 6L12 10L21 6 M12 10V22",

    check:
        "M3 3H21V21H3Z M7 12L10 15L17 8"
};

function createSvg(path, strokeWidth = 1.5) {

    const namespace =
        "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(
        namespace,
        "svg"
    );

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", strokeWidth);
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    const pathElement =
        document.createElementNS(namespace, "path");

    pathElement.setAttribute("d", path);

    svg.appendChild(pathElement);

    return svg;
}

function renderIcons() {

    document.querySelectorAll("[data-icon]")
        .forEach(element => {

            const path =
                iconPaths[element.dataset.icon];

            if (!path) return;

            element.replaceChildren(
                createSvg(path, 1.6)
            );
        });
}


// ========================================
// 防災用品アイコン
// ========================================

const supplyIconPaths = {

    "飲料水・食料":
        "M12 2C9 7 5 11 5 15" +
        "A7 7 0 0 0 19 15C19 11 15 7 12 2Z",

    "トイレ・衛生":
        "M4 3H10V11H4Z " +
        "M4 11H21V13Q21 18 15 19V22H9V19" +
        "Q4 17 4 11Z",

    "照明・電源":
        "M13 2L4 14H11L10 22L20 10H13Z",

    "防寒・生活":
        "M8 3L3 6L5 12L8 10V22H16V10" +
        "L19 12L21 6L16 3L12 6Z",

    "避難用品":
        iconPaths.bag,

    "医療・救急":
        "M9 3H15V9H21V15H15V21H9V15H3V9H9Z",

    "情報・通信":
        "M4 9H20V21H4Z " +
        "M5 9L18 2 M7 13H13 M7 16H13 " +
        "M17 15H17.1",

    "調理・生活用品":
        "M3 9H21V19H3Z " +
        "M7 9V5H17V9 M1 12H3 M21 12H23",

    "乳幼児用品":
        "M12 2V6 M9 6H15V9 " +
        "M8 9H16V22H8Z M10 13H13 M10 17H13",

    "高齢者用品":
        "M12 3A3 3 0 1 0 12 9 " +
        "A3 3 0 1 0 12 3 " +
        "M5 22V17Q5 11 12 11Q19 11 19 17V22",

    "ペット用品":
        "M5 7A2 2 0 1 0 5 11A2 2 0 1 0 5 7 " +
        "M10 3A2 2 0 1 0 10 7A2 2 0 1 0 10 3 " +
        "M15 3A2 2 0 1 0 15 7A2 2 0 1 0 15 3 " +
        "M20 7A2 2 0 1 0 20 11A2 2 0 1 0 20 7 " +
        "M12 11Q8 11 5 17Q3 22 9 21" +
        "L12 19L15 21Q21 22 19 17Q16 11 12 11Z"
};

const itemIconPaths = {

    "飲料水":
        supplyIconPaths["飲料水・食料"],

    "非常食":
        "M4 3V9Q4 12 7 12Q10 12 10 9V3 " +
        "M7 3V22 M17 3Q13 8 13 13H17V22 M17 3V13",

    "携帯トイレ":
        supplyIconPaths["トイレ・衛生"],

    "ウェットティッシュ":
        "M3 8H21V20H3Z M8 8L10 3H16L14 8 " +
        "M7 13H17",

    "トイレットペーパー":
        "M7 3H17A4 4 0 0 1 17 11H7 " +
        "A4 4 0 0 1 7 3Z M3 7V17 " +
        "A4 4 0 0 0 7 21H17V11 " +
        "M7 6A1 1 0 1 0 7 8A1 1 0 1 0 7 6",

    "ポリ袋":
        "M7 3H10V7H14V3H17V7L21 11V21H3V11Z",

    "マスク":
        "M5 8Q12 4 19 8V17Q12 21 5 17Z " +
        "M5 9H3Q1 9 1 12Q1 15 5 15 " +
        "M19 9H21Q23 9 23 12Q23 15 19 15 " +
        "M8 11H16 M8 14H16",

    "手指消毒用品":
        "M9 3H17 M12 3V7 M8 7H16V10 " +
        "M6 10H18V22H6Z M12 13V19 M9 16H15",

    "懐中電灯":
        "M7 3H17V8L15 12V22H9V12L7 8Z " +
        "M7 8H17 M12 15V17",

    "LEDランタン":
        "M8 6V3H16V6 M6 6H18V9H6Z " +
        "M8 9V19H16V9 M6 19H18V22H6Z",

    "モバイルバッテリー":
        "M5 5H19V21H5Z M9 2H15V5 " +
        "M13 8L9 14H13L11 18",

    "乾電池":
        "M8 4H16V22H8Z M10 2H14V4 " +
        "M10 8H14 M12 6V10 M10 18H14",

    "充電ケーブル":
        "M8 3H12V7H8Z M10 7V13 " +
        "Q10 17 14 17Q18 17 18 13V10 " +
        "M16 6H20V10H16Z",

    "防災リュック":
        iconPaths.bag,

    "救急セット":
        "M3 7H21V21H3Z M8 7V3H16V7 " +
        "M12 10V18 M8 14H16",

    "携帯ラジオ":
        supplyIconPaths["情報・通信"],

    "カセットコンロ":
        "M3 9H21V19H3Z " +
        "M7 9L9 5H15L17 9 " +
        "M6 15H6.1 M17 15H19",

    "カセットガス":
        "M9 3H15V6H9Z M7 6H17V22H7Z",

    "現金・小銭":
        "M3 5H21V19H3Z " +
        "M12 9A3 3 0 1 0 12 15A3 3 0 1 0 12 9"
};

function getSupplyIcon(item) {

    return (
        itemIconPaths[item.name] ||
        supplyIconPaths[item.category] ||
        iconPaths.box
    );
}


// ========================================
// API
// ========================================

async function fetchCalculation(
    storage = "all",
    sort = "category"
) {

    const response = await fetch(
        "/api/calculate",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                ...settings,

                storage_type: storage,
                sort_by: sort,

                owned: ownedHome,
                owned_go: ownedGo,

                selected_products: selectedProducts
            })
        }
    );

    if (!response.ok) {

        throw new Error(
            `計算APIエラー：${response.status}`
        );
    }

    return await response.json();
}


// ========================================
// 家庭情報
// ========================================

function renderHousehold() {

    let family =
        `大人${settings.adults}人・` +
        `子供${settings.children}人`;

    if (settings.pets > 0) {
        family += `・ペット${settings.pets}`;
    }

    setText("family-info", family);

    setText(
        "home-days-info",
        `自宅備蓄：${settings.days}日分`
    );

    setText(
        "go-days-info",
        `持ち出し：${settings.go_days}日分`
    );
}


// ========================================
// 金額表示
// ========================================

function renderPrice(prefix, result) {

    const price =
        result.known_total_price ??
        result.total_price;

    setText(
        `${prefix}-price`,
        yen(price)
    );

    const notes = [];

    if (result.has_unpriced_items) {
        notes.push("価格未登録の用品を除く");
    }

    if (result.has_sample_products) {
        notes.push("仮価格の商品を含む");
    }

    setText(
        `${prefix}-price-note`,
        notes.join(" ／ ")
    );
}


// ========================================
// 家庭設定画面
// ========================================

function initSettings() {

    const form = byId("settings-form");

    if (!form) return;

    Object.keys(DEFAULT_SETTINGS)
        .forEach(key => {

            const input = byId(key);

            if (input) {
                input.value = settings[key];
            }
        });

    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            showError("");

            if (!form.reportValidity()) return;

            const nextSettings = {};

            Object.keys(DEFAULT_SETTINGS)
                .forEach(key => {

                    nextSettings[key] =
                        Number(byId(key).value);
                });

            if (
                nextSettings.adults +
                nextSettings.children < 1
            ) {

                showError(
                    "家族の人数は1人以上にしてください。"
                );

                return;
            }

            if (
                nextSettings.infants >
                nextSettings.children
            ) {

                showError(
                    "乳幼児の人数は子供の人数以下にしてください。"
                );

                return;
            }

            if (
                nextSettings.seniors >
                nextSettings.adults
            ) {

                showError(
                    "高齢者の人数は大人の人数以下にしてください。"
                );

                return;
            }

            try {

                saveObject(
                    SETTINGS_KEY,
                    nextSettings
                );

                settings = nextSettings;

                window.location.href = "/builder";

            } catch (error) {

                showError(
                    "家庭設定を保存できませんでした。"
                );
            }
        }
    );
}


// ========================================
// ダッシュボード
// ========================================

function renderPreparationRate(items, type) {

    const targets = items.filter(
        item =>
            Number(item[`${type}_required`]) > 0
    );

    const completed = targets.filter(
        item =>
            Number(item[`${type}_shortage`]) === 0
    ).length;

    const rate = targets.length
        ? Math.round(
            completed / targets.length * 100
        )
        : 0;

    setText(
        `${type}-rate`,
        targets.length
            ? `${rate}%`
            : "対象なし"
    );

    setText(
        `${type}-detail`,
        `${completed} / ${targets.length}種類 準備完了`
    );

    setProgress(`${type}-progress`, rate);
}

function renderCategoryProgress(items) {

    const container = byId("category-progress");

    if (!container) return;

    container.replaceChildren();

    const categories = new Map();

    items.forEach(item => {

        if (!categories.has(item.category)) {

            categories.set(
                item.category,
                {
                    total: 0,
                    completed: 0
                }
            );
        }

        const category =
            categories.get(item.category);

        category.total++;

        if (Number(item.shortage) === 0) {
            category.completed++;
        }
    });

    categories.forEach((category, name) => {

        const rate = Math.round(
            category.completed /
            category.total * 100
        );

        const wrapper = createElement(
            "div",
            "category-progress"
        );

        const heading = createElement(
            "div",
            "category-progress-heading"
        );

        heading.append(

            createElement("span", "", name),

            createElement("span", "", `${rate}%`)
        );

        const progress = createElement(
            "div",
            "progress"
        );

        const fill = createElement(
            "div",
            "progress-fill"
        );

        fill.style.width = `${rate}%`;

        progress.appendChild(fill);

        wrapper.append(
            heading,
            progress
        );

        container.appendChild(wrapper);
    });
}

async function initDashboard() {

    renderHousehold();

    try {

        const result = await fetchCalculation();

        renderPreparationRate(
            result.items,
            "home"
        );

        renderPreparationRate(
            result.items,
            "go"
        );

        renderCategoryProgress(result.items);

        const shortages = result.items.filter(
            item => Number(item.shortage) > 0
        ).length;

        setText(
            "shortage-count",
            `${shortages}種類`
        );

        renderPrice("dashboard", result);

    } catch (error) {

        showError(error.message);
    }
}


// ========================================
// 所有数量入力
// ========================================

function createOwnedInput(item, type) {

    const input = createElement(
        "input",
        "quantity-input"
    );

    input.type = "number";
    input.min = "0";
    input.step = "any";

    input.id = `owned-${type}-${item.id}`;

    input.setAttribute(
        "aria-label",
        `${item.name} ${
            type === "home"
                ? "自宅備蓄"
                : "非常持ち出し"
        }の所有数量`
    );

    const owned =
        type === "home"
            ? ownedHome
            : ownedGo;

    const key =
        type === "home"
            ? HOME_KEY
            : GO_KEY;

    input.value = owned[item.id] ?? 0;

    input.addEventListener(
        "change",
        () => {

            const value = Number(input.value);

            if (
                input.value === "" ||
                !Number.isFinite(value) ||
                value < 0
            ) {

                input.value =
                    owned[item.id] ?? 0;

                return;
            }

            try {

                const next = {
                    ...owned,
                    [item.id]: value
                };

                saveObject(key, next);

                owned[item.id] = value;

                refreshBuilder();

            } catch (error) {

                input.value =
                    owned[item.id] ?? 0;

                showError(
                    "所有数量を保存できませんでした。"
                );
            }
        }
    );

    return input;
}


// ========================================
// 商品画像
// ========================================

function createSupplyVisual(item) {

    const visual = createElement(
        "div",
        "supply-visual"
    );

    function renderPlaceholder() {

        const placeholder = createElement(
            "div",
            "supply-visual-placeholder"
        );

        placeholder.appendChild(
            createSvg(
                getSupplyIcon(item),
                1.3
            )
        );

        visual.replaceChildren(placeholder);
    }

    const imageUrl = item.product
        ? safeUrl(item.product.image_url)
        : null;

    if (imageUrl && item.shortage > 0) {

        const image = createElement("img");

        image.src = imageUrl;
        image.alt = `購入候補：${item.product.name}`;
        image.loading = "lazy";

        image.addEventListener(
            "error",
            renderPlaceholder,
            { once: true }
        );

        visual.appendChild(image);

    } else {

        renderPlaceholder();
    }

    return visual;
}


// ========================================
// モーダル内の商品画像
// ========================================

function createModalProductImage(item, product) {

    const wrapper = createElement(
        "div",
        "modal-product-image"
    );

    function renderPlaceholder() {

        wrapper.replaceChildren(
            createSvg(
                getSupplyIcon(item),
                1.3
            )
        );
    }

    const imageUrl =
        safeUrl(product.image_url);

    if (imageUrl) {

        const image = createElement("img");

        image.src = imageUrl;
        image.alt = product.name;
        image.loading = "lazy";

        image.addEventListener(
            "error",
            renderPlaceholder,
            { once: true }
        );

        wrapper.appendChild(image);

    } else {

        renderPlaceholder();
    }

    return wrapper;
}


// ========================================
// 商品選択モーダル
// ========================================

function openProductModal(item) {

    const existing = byId("product-modal");

    if (existing) {

        if (existing.open) {
            existing.close();
        }

        existing.remove();
    }

    const options = item.product_options || [];

    if (!options.length) return;

    const previousFocus =
        document.activeElement;

    const previousOverflow =
        document.body.style.overflow;

    const dialog = createElement(
        "dialog",
        "product-modal"
    );

    dialog.id = "product-modal";

    dialog.setAttribute(
        "aria-labelledby",
        "product-modal-title"
    );

    let selected =
        selectedProducts[item.id] ?? null;

    if (
        !options.some(
            product => product.id === selected
        )
    ) {
        selected = null;
    }


    // ========================================
    // ヘッダー
    // ========================================

    const header = createElement(
        "div",
        "modal-header"
    );

    const title = createElement(
        "h2",
        "modal-title",
        `${item.name}の商品選択`
    );

    title.id = "product-modal-title";

    const closeButton = createElement(
        "button",
        "modal-close",
        "×"
    );

    closeButton.type = "button";

    closeButton.setAttribute(
        "aria-label",
        "閉じる"
    );

    closeButton.addEventListener(
        "click",
        () => dialog.close()
    );

    header.append(
        title,
        closeButton
    );


    // ========================================
    // 本文
    // ========================================

    const body = createElement(
        "div",
        "modal-body"
    );

    body.appendChild(
        createElement(
            "div",
            "modal-description",
            `必要数量：${format(item.quantity)}${item.unit}` +
            ` ／ 不足数量：${format(item.shortage)}${item.unit}`
        )
    );

    const list = createElement(
        "div",
        "modal-product-list"
    );

    const radioGroup =
        `product-option-${item.id}`;


    // ========================================
    // 自動選択
    // ========================================

    const autoOption = createElement(
        "label",
        "modal-product-option modal-product-auto"
    );

    const autoRadio = createElement("input");

    autoRadio.type = "radio";
    autoRadio.name = radioGroup;
    autoRadio.value = "";
    autoRadio.checked = selected === null;

    const autoContent = createElement(
        "div",
        "modal-product-content"
    );

    autoContent.append(

        createElement(
            "div",
            "modal-product-name",
            "自動選択（購入総額最安）"
        ),

        createElement(
            "div",
            "modal-product-detail",
            "不足数量を満たす購入候補から、購入総額が最も安い商品を選択します。"
        )
    );

    autoOption.append(
        autoRadio,
        autoContent
    );

    list.appendChild(autoOption);


    // ========================================
    // 商品候補一覧
    // ========================================

    options.forEach(product => {

        const option = createElement(
            "label",
            "modal-product-option"
        );

        const radio = createElement("input");

        radio.type = "radio";
        radio.name = radioGroup;
        radio.value = String(product.id);
        radio.checked = product.id === selected;

        const image = createModalProductImage(
            item,
            product
        );

        const content = createElement(
            "div",
            "modal-product-content"
        );


        // 商品名

        content.appendChild(
            createElement(
                "div",
                "modal-product-name",
                product.name
            )
        );


        // ブランド

        if (product.brand) {

            content.appendChild(
                createElement(
                    "div",
                    "modal-product-detail",
                    product.brand
                )
            );
        }


        // 内容量

        content.appendChild(
            createElement(
                "div",
                "modal-product-detail",
                `内容量：${format(product.quantity_per_package)}` +
                `${item.unit} / セット`
            )
        );


        // 購入セット数

        content.appendChild(
            createElement(
                "div",
                "modal-product-detail",
                `購入：${product.packages}セット × ` +
                yen(product.price)
            )
        );


        // 購入数量

        content.appendChild(
            createElement(
                "div",
                "modal-product-detail",
                `購入数量：${format(product.purchase_quantity)}` +
                `${item.unit}`
            )
        );


        // 単価

        if (
            product.unit_price !== null &&
            product.unit_price !== undefined
        ) {

            content.appendChild(
                createElement(
                    "div",
                    "modal-product-detail",
                    `単価：${yen(product.unit_price)} / ${item.unit}`
                )
            );
        }


        // 余剰数量

        if (product.surplus_quantity > 0) {

            content.appendChild(
                createElement(
                    "div",
                    "modal-product-detail",
                    `購入後の余剰：` +
                    `${format(product.surplus_quantity)}${item.unit}`
                )
            );
        }


        // 仮商品

        if (product.is_sample) {

            content.appendChild(
                createElement(
                    "div",
                    "modal-product-detail",
                    "仮商品・仮価格"
                )
            );
        }


        // 購入総額

        content.appendChild(
            createElement(
                "div",
                "modal-product-price",
                yen(product.subtotal)
            )
        );


        // 購入先リンク

        const url = safeUrl(product.url);

        if (url) {

            const link = createElement(
                "a",
                "modal-product-link",
                "購入先の商品ページを見る"
            );

            link.href = url;
            link.target = "_blank";
            link.rel =
                "noopener noreferrer sponsored";

            link.addEventListener(
                "click",
                event => event.stopPropagation()
            );

            content.appendChild(link);
        }

        option.append(
            radio,
            image,
            content
        );

        list.appendChild(option);
    });


    // ========================================
    // 選択状態
    // ========================================

    function updateSelectedStyle() {

        list.querySelectorAll(
            ".modal-product-option"
        ).forEach(option => {

            const radio = option.querySelector(
                'input[type="radio"]'
            );

            option.classList.toggle(
                "selected",
                radio.checked
            );
        });
    }

    list.addEventListener(
        "change",
        event => {

            if (
                event.target.type !== "radio"
            ) {
                return;
            }

            selected = event.target.value
                ? Number(event.target.value)
                : null;

            updateSelectedStyle();
        }
    );

    updateSelectedStyle();

    body.appendChild(list);

    const modalError = createElement(
        "div",
        "modal-error"
    );

    modalError.setAttribute(
        "role",
        "alert"
    );

    body.appendChild(modalError);


    // ========================================
    // フッター
    // ========================================

    const footer = createElement(
        "div",
        "modal-footer"
    );

    const cancelButton = createElement(
        "button",
        "button button-outline",
        "キャンセル"
    );

    cancelButton.type = "button";

    cancelButton.addEventListener(
        "click",
        () => dialog.close()
    );

    const applyButton = createElement(
        "button",
        "button",
        "この商品を選択"
    );

    applyButton.type = "button";


    // ========================================
    // 商品選択の確定
    // ========================================

    applyButton.addEventListener(
        "click",
        () => {

            const next = {
                ...selectedProducts
            };

            if (selected === null) {

                delete next[item.id];

            } else {

                next[item.id] = selected;
            }

            try {

                saveObject(
                    PRODUCT_KEY,
                    next
                );

                selectedProducts = next;

                dialog.close();

                refreshBuilder();

            } catch (error) {

                modalError.textContent =
                    "商品選択を保存できませんでした。";
            }
        }
    );

    footer.append(
        cancelButton,
        applyButton
    );


    // ========================================
    // モーダル生成
    // ========================================

    dialog.append(
        header,
        body,
        footer
    );

    document.body.appendChild(dialog);


    // 背景クリックで閉じる

    dialog.addEventListener(
        "click",
        event => {

            if (event.target !== dialog) {
                return;
            }

            const rect =
                dialog.getBoundingClientRect();

            const outside =
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom;

            if (outside) {
                dialog.close();
            }
        }
    );


    // 閉じたときの処理

    dialog.addEventListener(
        "close",
        () => {

            document.body.style.overflow =
                previousOverflow;

            dialog.remove();

            if (
                previousFocus &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }
        },
        { once: true }
    );

    dialog.showModal();

    document.body.style.overflow = "hidden";
}


// ========================================
// コンパクト購入候補
// ========================================

function createProductRow(item) {

    const row = createElement(
        "div",
        "product-row"
    );


    // 準備完了

    if (item.shortage <= 0) {

        row.appendChild(
            createElement(
                "div",
                "product-completed",
                "✓ 準備完了"
            )
        );

        return row;
    }


    // 商品未登録

    const product = item.product;

    if (!product) {

        row.appendChild(
            createElement(
                "div",
                "product-unavailable",
                "購入候補未登録"
            )
        );

        return row;
    }


    // 商品名

    const name = createElement(
        "div",
        "product-name",
        product.name
    );

    name.title = product.name;

    row.appendChild(name);


    // 購入総額・変更ボタン

    const priceRow = createElement(
        "div",
        "product-price-row"
    );

    const price = createElement(
        "div",
        "product-price",
        yen(product.subtotal)
    );

    const changeButton = createElement(
        "button",
        "product-change-button",
        "変更"
    );

    changeButton.type = "button";

    changeButton.setAttribute(
        "aria-label",
        `${item.name}の購入候補を変更`
    );

    changeButton.addEventListener(
        "click",
        () => openProductModal(item)
    );

    priceRow.append(
        price,
        changeButton
    );

    row.appendChild(priceRow);


    // 仮価格

    if (product.is_sample) {

        row.appendChild(
            createElement(
                "div",
                "product-sample-note",
                "仮商品・仮価格"
            )
        );
    }

    return row;
}


// ========================================
// 数量表示
// ========================================

function createQuantityBlock(
    label,
    value,
    unit,
    color = ""
) {

    const wrapper = createElement("div");

    const quantity = createElement(
        "div",
        `quantity-value ${color}`,
        format(value)
    );

    quantity.appendChild(
        createElement(
            "span",
            "quantity-unit",
            unit
        )
    );

    wrapper.append(

        createElement(
            "div",
            "quantity-label",
            label
        ),

        quantity
    );

    return wrapper;
}


// ========================================
// 保管区分別数量
// ========================================

function createStorageRow(item, type) {

    const row = createElement(
        "div",
        "storage-row"
    );

    const label =
        type === "home"
            ? "自宅"
            : "持出";

    const required =
        type === "home"
            ? item.home_required
            : item.go_required;

    row.append(

        createElement(
            "div",
            "storage-label",
            label
        ),

        createOwnedInput(item, type),

        createElement(
            "div",
            "storage-required",
            `/ ${format(required)}${item.unit}`
        )
    );

    return row;
}


// ========================================
// コンパクト防災用品カード
// ========================================

function createSupplyCard(item) {

    const card = createElement(
        "article",
        "supply-card"
    );

    if (item.shortage <= 0) {
        card.classList.add("completed");
    }


    // ========================================
    // タイトル・優先度
    // ========================================

    const heading = createElement(
        "div",
        "supply-heading"
    );

    const priorityLabels = {
        essential: "必須",
        recommended: "推奨",
        optional: "任意"
    };

    heading.append(

        createElement(
            "div",
            "supply-name",
            item.name
        ),

        createElement(
            "div",
            `supply-priority ${item.priority}`,
            priorityLabels[item.priority] || "推奨"
        )
    );

    card.appendChild(heading);


    // ========================================
    // 商品画像
    // ========================================

    card.appendChild(
        createSupplyVisual(item)
    );


    // ========================================
    // 必要・所有・不足
    // ========================================

    const quantities = createElement(
        "div",
        "supply-quantities"
    );

    quantities.append(

        createQuantityBlock(
            "必要",
            item.quantity,
            item.unit
        ),

        createQuantityBlock(
            "所有",
            item.owned,
            item.unit,
            "text-success"
        ),

        createQuantityBlock(
            "不足",
            item.shortage,
            item.unit,
            item.shortage > 0
                ? "text-danger"
                : "text-success"
        )
    );

    card.appendChild(quantities);


    // ========================================
    // 準備率
    // ========================================

    const rate = item.quantity > 0
        ? (
            item.quantity - item.shortage
        ) / item.quantity * 100
        : 100;

    const safeRate = Math.max(
        0,
        Math.min(100, rate)
    );

    const displayRate = item.shortage > 0
        ? Math.min(99, Math.round(safeRate))
        : 100;

    const progressWrapper = createElement(
        "div",
        "supply-progress"
    );

    progressWrapper.title =
        `準備率：${displayRate}%`;

    const progress = createElement(
        "div",
        "progress"
    );

    progress.setAttribute(
        "role",
        "progressbar"
    );

    progress.setAttribute(
        "aria-label",
        `${item.name}の準備率`
    );

    progress.setAttribute(
        "aria-valuemin",
        "0"
    );

    progress.setAttribute(
        "aria-valuemax",
        "100"
    );

    progress.setAttribute(
        "aria-valuenow",
        String(displayRate)
    );

    const fill = createElement(
        "div",
        "progress-fill"
    );

    fill.style.width = `${safeRate}%`;

    progress.appendChild(fill);

    progressWrapper.appendChild(progress);

    card.appendChild(progressWrapper);


    // ========================================
    // 自宅・持ち出し数量
    // ========================================

    const storage = createElement(
        "div",
        "supply-storage"
    );

    if (
        storageType !== "go" &&
        item.home_required > 0
    ) {

        storage.appendChild(
            createStorageRow(item, "home")
        );
    }

    if (
        storageType !== "home" &&
        item.go_required > 0
    ) {

        storage.appendChild(
            createStorageRow(item, "go")
        );
    }

    card.appendChild(storage);


    // ========================================
    // 購入候補
    // ========================================

    card.appendChild(
        createProductRow(item)
    );

    return card;
}


// ========================================
// 防災用品グリッド
// ========================================

function createSupplyGrid(items) {

    const grid = createElement(
        "div",
        "supply-grid"
    );

    items.forEach(item => {

        grid.appendChild(
            createSupplyCard(item)
        );
    });

    return grid;
}


// ========================================
// 防災用品構成画面
// ========================================

function renderBuilder(result) {

    const container = byId("builder-items");

    if (!container) return;

    const focusedId =
        document.activeElement?.id;

    const restoreOwnedFocus =
        focusedId &&
        focusedId.startsWith("owned-");

    container.replaceChildren();

    const missingOnly =
        byId("missing-only").checked;

    const items = result.items.filter(
        item => !missingOnly || item.shortage > 0
    );

    const shortageCount = result.items.filter(
        item => item.shortage > 0
    ).length;

    setText(
        "builder-summary",
        `対象${result.items.length}種類 ／ ` +
        `不足${shortageCount}種類`
    );


    // 表示対象なし

    if (!items.length) {

        container.appendChild(
            createElement(
                "div",
                "card muted",
                "表示対象の用品はありません。"
            )
        );

        renderPrice("builder", result);

        return;
    }


    // ========================================
    // カテゴリ順
    // ========================================

    if (sortBy === "category") {

        const categories = new Map();

        items.forEach(item => {

            if (!categories.has(item.category)) {

                categories.set(
                    item.category,
                    []
                );
            }

            categories.get(
                item.category
            ).push(item);
        });

        categories.forEach(
            (categoryItems, categoryName) => {

                const section = createElement(
                    "section",
                    "builder-category"
                );

                section.appendChild(
                    createElement(
                        "h2",
                        "builder-category-title",
                        `${categoryName}（${categoryItems.length}）`
                    )
                );

                section.appendChild(
                    createSupplyGrid(categoryItems)
                );

                container.appendChild(section);
            }
        );


    // ========================================
    // 優先度順
    // ========================================

    } else {

        container.appendChild(
            createSupplyGrid(items)
        );
    }


    // 購入金額

    renderPrice(
        "builder",
        result
    );


    // 再描画後の入力フォーカス

    if (restoreOwnedFocus) {

        const input = byId(focusedId);

        if (input) {
            input.focus({
                preventScroll: true
            });
        }
    }
}

async function refreshBuilder() {

    const sequence = ++requestSequence;

    showError("");

    try {

        const result = await fetchCalculation(
            storageType,
            sortBy
        );

        if (sequence !== requestSequence) {
            return;
        }

        renderBuilder(result);

    } catch (error) {

        if (sequence !== requestSequence) {
            return;
        }

        showError(error.message);
    }
}

function initBuilder() {

    renderHousehold();

    const params = new URLSearchParams(
        window.location.search
    );

    if (params.get("missing") === "1") {
        byId("missing-only").checked = true;
    }

    document.querySelectorAll("[data-storage]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    storageType =
                        button.dataset.storage;

                    document.querySelectorAll(
                        "[data-storage]"
                    ).forEach(tab => {

                        tab.classList.toggle(
                            "active",
                            tab === button
                        );
                    });

                    refreshBuilder();
                }
            );
        });

    byId("missing-only").addEventListener(
        "change",
        refreshBuilder
    );

    byId("sort-by").addEventListener(
        "change",
        event => {

            sortBy = event.target.value;

            refreshBuilder();
        }
    );

    refreshBuilder();
}


// ========================================
// 非常持ち出し管理
// ========================================

async function initBackpack() {

    try {

        const result = await fetchCalculation();

        setText(
            "carry-weight",
            `${format(result.total_go_weight)} kg`
        );

        setText(
            "carry-volume",
            `${format(result.total_go_volume)} L`
        );

        setText(
            "weight-detail",
            `上限 ${settings.max_carry_weight}kg` +
            ` ／ 重量不明 ${result.unknown_weight_count}種類`
        );

        setText(
            "volume-detail",
            `容量 ${settings.backpack_capacity}L` +
            ` ／ 容量不明 ${result.unknown_volume_count}種類`
        );

        setProgress(
            "weight-progress",
            result.weight_usage
        );

        setProgress(
            "volume-progress",
            result.capacity_usage
        );

        if (result.weight_exceeded) {

            byId("carry-weight")
                ?.classList.add("text-danger");
        }

        if (result.capacity_exceeded) {

            byId("carry-volume")
                ?.classList.add("text-danger");
        }

    } catch (error) {

        showError(error.message);
    }
}


// ========================================
// 購入リスト
// ========================================

async function initShopping() {

    try {

        const result = await fetchCalculation();

        renderPrice("shopping", result);

        const container = byId("shopping-items");

        if (!container) return;

        container.replaceChildren();

        const items = result.items.filter(
            item => item.shortage > 0
        );

        if (!items.length) {

            container.appendChild(
                createElement(
                    "p",
                    "muted",
                    "現在、不足している用品はありません。"
                )
            );

            return;
        }

        items.forEach(item => {

            const row = createElement(
                "div",
                "action-row"
            );

            const product = item.product;

            const imageUrl = product
                ? safeUrl(product.image_url)
                : null;

            if (imageUrl) {

                const image = createElement(
                    "img",
                    "product-image"
                );

                image.src = imageUrl;
                image.alt = product.name;
                image.loading = "lazy";

                image.addEventListener(
                    "error",
                    () => image.remove(),
                    { once: true }
                );

                row.appendChild(image);
            }

            const content = createElement(
                "div",
                "action-content"
            );

            content.append(

                createElement(
                    "div",
                    "action-title",
                    item.name
                ),

                createElement(
                    "div",
                    "text-danger",
                    `${format(item.shortage)}${item.unit}不足`
                )
            );

            if (product) {

                content.append(

                    createElement(
                        "div",
                        "action-description",
                        product.name
                    ),

                    createElement(
                        "div",
                        "action-description",
                        `${product.packages}セット × ` +
                        yen(product.price)
                    )
                );

                if (product.is_sample) {

                    content.appendChild(
                        createElement(
                            "div",
                            "muted",
                            "仮商品・仮価格"
                        )
                    );
                }

            } else {

                content.appendChild(
                    createElement(
                        "div",
                        "muted",
                        "購入候補未登録"
                    )
                );
            }

            row.appendChild(content);

            row.appendChild(
                createElement(
                    "div",
                    "action-value",
                    product
                        ? yen(product.subtotal)
                        : "未登録"
                )
            );

            const url = product
                ? safeUrl(product.url)
                : null;

            if (url) {

                const link = createElement(
                    "a",
                    "button",
                    "購入先を見る"
                );

                link.href = url;
                link.target = "_blank";
                link.rel =
                    "noopener noreferrer sponsored";

                row.appendChild(link);
            }

            container.appendChild(row);
        });

    } catch (error) {

        showError(error.message);
    }
}


// ========================================
// モバイルメニュー
// ========================================

function initMobileMenu() {

    const menu = byId("mobile-menu");
    const sidebar = byId("sidebar");
    const overlay = byId("sidebar-overlay");

    if (!menu || !sidebar || !overlay) {
        return;
    }

    function setOpen(open) {

        sidebar.classList.toggle(
            "open",
            open
        );

        overlay.hidden = !open;

        menu.setAttribute(
            "aria-expanded",
            String(open)
        );
    }

    menu.addEventListener(
        "click",
        () => {

            setOpen(
                !sidebar.classList.contains("open")
            );
        }
    );

    overlay.addEventListener(
        "click",
        () => setOpen(false)
    );

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                setOpen(false);
            }
        }
    );

    window.matchMedia("(min-width: 769px)")
        .addEventListener(
            "change",
            event => {

                if (event.matches) {
                    setOpen(false);
                }
            }
        );
}


// ========================================
// 初期化
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderIcons();

        initMobileMenu();

        setText(
            "current-date",
            new Date().toLocaleDateString(
                "ja-JP",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            )
        );

        const page = document.querySelector(
            ".main-content"
        )?.dataset.page;

        switch (page) {

            case "dashboard":
                initDashboard();
                break;

            case "settings":
                initSettings();
                break;

            case "builder":
                initBuilder();
                break;

            case "backpack":
                initBackpack();
                break;

            case "shopping":
                initShopping();
                break;
        }
    }
);


// ========================================
// Disaster Builder Design v2
// ========================================


// ========================================
// カテゴリ定義
// ========================================

const CATEGORY_DESIGN = {

    "飲料水・食料": {
        key: "food",
        icon: "water"
    },

    "トイレ・衛生": {
        key: "hygiene",
        icon: "toilet"
    },

    "照明・電源": {
        key: "power",
        icon: "flashlight"
    },

    "防寒・生活": {
        key: "life",
        icon: "blanket"
    },

    "避難用品": {
        key: "evacuation",
        icon: "bag"
    },

    "医療・救急": {
        key: "medical",
        icon: "medical"
    },

    "情報・通信": {
        key: "info",
        icon: "radio"
    },

    "調理・生活用品": {
        key: "cooking",
        icon: "cooking"
    },

    "乳幼児用品": {
        key: "infant",
        icon: "baby"
    },

    "高齢者用品": {
        key: "senior",
        icon: "medical"
    },

    "ペット用品": {
        key: "pet",
        icon: "paw"
    }
};


// ========================================
// アイコン追加
// ========================================

Object.assign(iconPaths, {

    list:
        "M8 5H21 M8 12H21 M8 19H21 " +
        "M3 5H4 M3 12H4 M3 19H4",

    water:
        "M9 2H15V5L17 8V21H7V8L9 5Z " +
        "M7 11H17 M7 17H17 M9 5H15",

    food:
        "M3 12H21 " +
        "M5 12C5 17 8 20 12 20 " +
        "C16 20 19 17 19 12 " +
        "M8 22H16 M8 8L9 3 M14 8L15 3",

    toilet:
        "M3 3H10V12H3Z M3 12H21 " +
        "C21 17 17 19 13 19H8 " +
        "M8 19L7 22H18L16 19",

    tissue:
        "M3 10H21V21H3Z M8 10V6L12 3 " +
        "L17 6V10 M8 15H16",

    roll:
        "M8 4H17C21 4 21 20 17 20H8 " +
        "C3 20 3 4 8 4Z " +
        "M8 4C13 4 13 20 8 20 " +
        "M8 9C10 9 10 15 8 15 " +
        "C6 15 6 9 8 9",

    shoppingbag:
        "M4 8H20L21 22H3Z " +
        "M8 10V6A4 4 0 0 1 16 6V10",

    mask:
        "M5 7H19V17L12 20L5 17Z " +
        "M5 9C0 6 0 17 5 15 " +
        "M19 9C24 6 24 17 19 15 " +
        "M8 11H16 M8 15H16",

    bottle:
        "M9 3H15V7L18 10V22H6V10L9 7Z " +
        "M9 7H15 M6 13H18",

    flashlight:
        "M7 3H17V8L15 11V21H9V11L7 8Z " +
        "M7 8H17 M9 15H15",

    lantern:
        "M8 5V3H16V5 M5 5H19V8H5Z " +
        "M7 8V19H17V8 M5 19H19V22H5Z " +
        "M10 11V16 M14 11V16",

    battery:
        "M3 6H19V18H3Z M19 10H22V14H19 " +
        "M11 8L8 13H12L10 16",

    batteries:
        "M5 5H10V22H5Z M6 2H9V5 " +
        "M14 5H19V22H14Z M15 2H18V5",

    cable:
        "M4 3H9V8H4Z M6 8V15 " +
        "C6 23 18 23 18 15V10 " +
        "M15 5H21V10H15Z",

    blanket:
        "M4 5H17L20 8V21H4Z " +
        "M17 5V9H20 M7 12H17 M7 16H17",

    bed:
        "M3 4V21 M21 12V21 " +
        "M3 17H21 M3 10H8V15H3 " +
        "M8 10H18L21 13V17",

    heat:
        "M12 2V5 M12 19V22 " +
        "M2 12H5 M19 12H22 " +
        "M5 5L7 7 M17 17L19 19 " +
        "M5 19L7 17 M17 7L19 5 " +
        "M12 7A5 5 0 1 0 12 17 " +
        "A5 5 0 1 0 12 7",

    raincoat:
        "M8 3L3 8L6 14L8 12V22H16V12 " +
        "L18 14L21 8L16 3Z M12 5V22",

    gloves:
        "M6 21L3 12L5 10L8 13V4 " +
        "Q9 1 10 4V10V3Q11 0 12 3 " +
        "V10V4Q13 1 14 4V11V6 " +
        "Q16 3 17 6V15L15 21Z",

    towel:
        "M4 4H20V19H4Z M8 4V19 " +
        "M4 15H20",

    medical:
        "M3 6H21V21H3Z M8 6V3H16V6 " +
        "M12 10V17 M8.5 13.5H15.5",

    medicine:
        "M5 19C2 16 2 12 5 9L9 5 " +
        "C12 2 16 2 19 5 " +
        "C22 8 22 12 19 15L15 19 " +
        "C12 22 8 22 5 19Z M7 7L17 17",

    bandage:
        "M4 15L15 4Q18 1 21 4 " +
        "Q24 7 21 10L10 21 " +
        "Q7 24 4 21Q1 18 4 15Z " +
        "M9 10L14 15 M10 9L15 14",

    radio:
        "M3 8H21V21H3Z M5 8L19 2 " +
        "M6 12H12V17H6Z " +
        "M15 12H18 M15 16H18",

    note:
        "M5 3H19V21H5Z " +
        "M8 7H16 M8 11H16 M8 15H13",

    money:
        "M3 5H21V19H3Z " +
        "M9 8L12 12L15 8 " +
        "M12 12V17 M9 13H15 M9 15H15",

    cooking:
        "M3 11H21V21H3Z " +
        "M7 15H17 M8 8H16 " +
        "M10 8V4H14V8",

    gas:
        "M9 2H15V5L18 8V22H6V8L9 5Z " +
        "M6 11H18 M6 18H18",

    plate:
        "M12 2A10 10 0 1 0 12 22 " +
        "A10 10 0 1 0 12 2 " +
        "M12 7A5 5 0 1 0 12 17 " +
        "A5 5 0 1 0 12 7",

    baby:
        "M12 5A8 8 0 1 0 12 21 " +
        "A8 8 0 1 0 12 5 " +
        "M9 12H9.1 M15 12H15.1 " +
        "M9 16Q12 19 15 16 " +
        "M12 5Q16 1 12 1",

    diaper:
        "M3 5H21V13L16 22H8L3 13Z " +
        "M3 10L8 13 M21 10L16 13",

    paw:
        "M12 11C8 11 4 16 6 19 " +
        "C8 22 10 19 12 19 " +
        "C14 19 16 22 18 19 " +
        "C20 16 16 11 12 11Z " +
        "M5 6A2 3 0 1 0 5 12 " +
        "A2 3 0 1 0 5 6 " +
        "M10 2A2 3 0 1 0 10 8 " +
        "A2 3 0 1 0 10 2 " +
        "M15 2A2 3 0 1 0 15 8 " +
        "A2 3 0 1 0 15 2 " +
        "M20 6A2 3 0 1 0 20 12 " +
        "A2 3 0 1 0 20 6"
});


// ========================================
// 用品ごとのアイコン
// ========================================

const ITEM_DESIGN_ICONS = {

    "飲料水": "water",
    "非常食": "food",

    "携帯トイレ": "toilet",
    "ウェットティッシュ": "tissue",
    "トイレットペーパー": "roll",
    "ポリ袋": "shoppingbag",
    "マスク": "mask",
    "手指消毒用品": "bottle",
    "生理用品": "tissue",

    "懐中電灯": "flashlight",
    "LEDランタン": "lantern",
    "モバイルバッテリー": "battery",
    "乾電池": "batteries",
    "充電ケーブル": "cable",

    "アルミブランケット": "blanket",
    "毛布": "bed",
    "使い捨てカイロ": "heat",
    "レインコート": "raincoat",
    "軍手": "gloves",
    "タオル": "towel",

    "防災リュック": "bag",

    "救急セット": "medical",
    "常備薬・処方薬": "medicine",
    "絆創膏": "bandage",

    "携帯ラジオ": "radio",
    "緊急連絡先メモ": "note",
    "現金・小銭": "money",

    "カセットコンロ": "cooking",
    "カセットガス": "gas",
    "紙皿": "plate",
    "ラップ": "roll",

    "乳児用ミルク": "bottle",
    "紙おむつ": "diaper",
    "おしりふき": "tissue",
    "哺乳瓶・授乳用品": "bottle",

    "介護用品": "medical",
    "大人用おむつ": "diaper",

    "ペットフード": "paw",
    "ペット用飲料水": "water",
    "ペット用トイレ用品": "toilet",
    "ペット用キャリー": "bag"
};


// ========================================
// 共通デザイン関数
// ========================================

function getCategoryDesign(category) {

    return CATEGORY_DESIGN[category] || {
        key: "food",
        icon: "box"
    };
}


function createDesignIcon(name, className = "") {

    const wrapper = createElement("span", className);

    const lucideIconMap = {

        dashboard: "LayoutGrid",
        list: "List",

        water: "Droplets",
        food: "Utensils",

        toilet: "Bath",
        tissue: "Layers",
        roll: "Scroll",
        shoppingbag: "ShoppingBag",
        mask: "Shield",
        bottle: "BottleWine",

        flashlight: "Flashlight",
        lantern: "Lamp",
        battery: "BatteryCharging",
        batteries: "BatteryFull",
        cable: "Cable",

        blanket: "Bed",
        bed: "BedDouble",
        heat: "Sun",
        raincoat: "Shirt",
        gloves: "Hand",
        towel: "Layers",

        bag: "Backpack",

        medical: "BriefcaseMedical",
        medicine: "Pill",
        bandage: "Bandage",

        radio: "Radio",
        note: "NotebookPen",
        money: "Banknote",

        cooking: "CookingPot",
        gas: "Cylinder",
        plate: "CircleDot",

        baby: "Baby",
        diaper: "Baby",

        paw: "PawPrint",

        box: "Box",
        home: "House",
        calendar: "CalendarDays",
        check: "CircleCheck",
        cart: "ShoppingCart",
        history: "History",
        settings: "Settings"
    };

    const iconName = lucideIconMap[name] || "Box";

    const iconNode = window.lucide?.icons?.[iconName];

    if (iconNode && window.lucide?.createElement) {

        const svg = window.lucide.createElement(
            iconNode,
            {
                width: 24,
                height: 24,
                stroke: "currentColor",
                "stroke-width": 2,
                "aria-hidden": "true"
            }
        );

        wrapper.appendChild(svg);

    } else {

        // Lucideを読み込めなかった場合は
        // 既存のSVGアイコンを使用する

        const path = iconPaths[name] || iconPaths.box;

        wrapper.innerHTML = `
            <svg viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="1.8"
                 stroke-linecap="round"
                 stroke-linejoin="round"
                 aria-hidden="true">
                <path d="${path}"/>
            </svg>
        `;
    }

    return wrapper;
}

function createDesignProgress(rate) {

    const progress = createElement("div", "progress");

    const fill = createElement("div", "progress-fill");

    const safeRate = Math.max(
        0,
        Math.min(100, Number(rate) || 0)
    );

    fill.style.width = `${safeRate}%`;

    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute(
        "aria-valuenow",
        String(Math.round(safeRate))
    );

    progress.appendChild(fill);

    return progress;
}


function getItemPreparationRate(item) {

    if (Number(item.quantity) <= 0) {
        return 100;
    }

    return Math.max(
        0,
        Math.min(
            100,
            (
                Number(item.quantity) -
                Number(item.shortage)
            ) / Number(item.quantity) * 100
        )
    );
}


function createSupplyVisual(item) {

    const design = getCategoryDesign(item.category);

    const visual = createElement(
        "div",
        "supply-visual"
    );

    visual.dataset.category = design.key;

    visual.append(

        createElement(
            "div",
            "supply-category-label",
            item.category
        ),

        createDesignIcon(
            ITEM_DESIGN_ICONS[item.name] || design.icon,
            "supply-visual-icon"
        )
    );

    return visual;
}


// ========================================
// 構成画面の表示状態
// ========================================

let builderViewV2 = "grid";
let builderResultV2 = null;
let openedItemIdV2 = null;


// ========================================
// D-1 用品カード
// ========================================

function createSupplyCardV2(item) {

    const card = createElement(
        "article",
        "supply-card-v2"
    );

    const shortage = Number(item.shortage);

    const status = createElement(
        "div",

        shortage > 0
            ? "supply-card-status text-shortage"
            : "supply-card-status text-success",

        shortage > 0
            ? `あと${format(shortage)}${item.unit}`
            : "✓ 準備完了"
    );

    const detailButton = createElement(
        "button",
        "supply-detail-button",
        "詳細を見る"
    );

    detailButton.type = "button";

    detailButton.addEventListener(
        "click",
        () => openSupplyDialogV2(item.id)
    );

    card.append(

        createSupplyVisual(item),

        createElement(
            "div",
            "supply-card-name",
            item.name
        ),

        status,

        createDesignProgress(
            getItemPreparationRate(item)
        ),

        createElement(
            "div",
            "supply-card-quantity",
            `${format(item.owned)} / ` +
            `${format(item.quantity)}${item.unit}`
        ),

        detailButton
    );

    return card;
}


// ========================================
// 詳細ダイアログ
// ========================================

function renderSupplyDialogV2(item) {

    const content = byId("dialog-content");

    if (!content) return;

    setText("dialog-title", item.name);

    content.replaceChildren();

    content.appendChild(
        createSupplyVisual(item)
    );

    const quantities = createElement(
        "div",
        "dialog-quantities"
    );

    const quantityData = [

        {
            label: "必要数量",
            value: item.quantity,
            color: ""
        },

        {
            label: "所有数量",
            value: item.owned,
            color: ""
        },

        {
            label: "不足数量",
            value: item.shortage,
            color: item.shortage > 0
                ? "text-shortage"
                : "text-success"
        }
    ];

    quantityData.forEach(data => {

        const box = createElement(
            "div",
            "dialog-quantity-box"
        );

        box.append(

            createElement(
                "div",
                "muted",
                data.label
            ),

            createElement(
                "div",
                `quantity-value ${data.color}`,
                `${format(data.value)}${item.unit}`
            )
        );

        quantities.appendChild(box);
    });

    content.append(

        quantities,

        createDesignProgress(
            getItemPreparationRate(item)
        )
    );

    if (storageType === "all") {

        content.appendChild(

            createElement(
                "p",
                "muted",
                `自宅必要：${format(item.home_required)}${item.unit}` +
                ` ／ 持出必要：${format(item.go_required)}${item.unit}`
            )
        );
    }

    const ownedWrapper = createElement(
        "div",
        "dialog-owned"
    );

    if (
        storageType !== "go" &&
        item.home_required > 0
    ) {

        ownedWrapper.appendChild(
            createOwnedInput(item, "home")
        );
    }

    if (
        storageType !== "home" &&
        item.go_required > 0
    ) {

        ownedWrapper.appendChild(
            createOwnedInput(item, "go")
        );
    }

    content.appendChild(ownedWrapper);

    if (item.shortage > 0) {

        const productWrapper = createElement(
            "div",
            "dialog-product"
        );

        productWrapper.append(

            createElement(
                "h3",
                "",
                "購入する商品"
            ),

            createProductRow(item)
        );

        content.appendChild(productWrapper);

    } else {

        content.appendChild(

            createElement(
                "p",
                "text-success",
                "必要数量を準備できています。"
            )
        );
    }
}


function openSupplyDialogV2(itemId) {

    if (!builderResultV2) return;

    const item = builderResultV2.items.find(
        entry => entry.id === itemId
    );

    if (!item) return;

    const dialog = byId("supply-dialog");

    openedItemIdV2 = itemId;

    renderSupplyDialogV2(item);

    if (!dialog.open) {
        dialog.showModal();
    }
}


function closeSupplyDialogV2() {

    const dialog = byId("supply-dialog");

    if (dialog && dialog.open) {
        dialog.close();
    }

    openedItemIdV2 = null;
}


// ========================================
// カテゴリフィルター
// ========================================

function updateCategoryFilterV2(items) {

    const select = byId("category-filter");

    const previousValue = select.value;

    const categories = [
        ...new Set(items.map(item => item.category))
    ];

    select.replaceChildren();

    const allOption = createElement(
        "option",
        "",
        "すべてのカテゴリ"
    );

    allOption.value = "";

    select.appendChild(allOption);

    categories.forEach(category => {

        const option = createElement(
            "option",
            "",
            category
        );

        option.value = category;

        select.appendChild(option);
    });

    select.value = categories.includes(previousValue)
        ? previousValue
        : "";
}


// ========================================
// 構成画面描画
// 既存 renderBuilder を上書き
// ========================================

renderBuilder = function (result) {

    builderResultV2 = result;

    const container = byId("builder-items");

    updateCategoryFilterV2(result.items);

    const category = byId("category-filter").value;

    const missingOnly = byId("missing-only").checked;

    const items = result.items.filter(item => {

        if (
            category &&
            item.category !== category
        ) {
            return false;
        }

        if (
            missingOnly &&
            Number(item.shortage) <= 0
        ) {
            return false;
        }

        return true;
    });

    const required = result.items.length;

    const missing = result.items.filter(
        item => Number(item.shortage) > 0
    ).length;

    const completed = required - missing;

    setText("builder-required", required);
    setText("builder-completed", completed);
    setText("builder-missing", missing);

    setText(
        "builder-summary",
        `${items.length}種類を表示`
    );

    container.className =
        builderViewV2 === "list"
            ? "supply-list"
            : "supply-grid";

    container.replaceChildren();

    if (!items.length) {

        container.appendChild(

            createElement(
                "div",
                "card muted",
                "表示対象の用品はありません。"
            )
        );

    } else {

        items.forEach(item => {

            container.appendChild(
                createSupplyCardV2(item)
            );
        });
    }

    renderPrice("builder", result);

    // 詳細画面を開いたまま数量や商品を変更した場合、
    // 最新の計算結果を詳細画面にも反映する。

    const dialog = byId("supply-dialog");

    if (
        dialog &&
        dialog.open &&
        openedItemIdV2 !== null
    ) {

        const updatedItem = result.items.find(
            item => item.id === openedItemIdV2
        );

        if (updatedItem) {

            renderSupplyDialogV2(updatedItem);

        } else {

            closeSupplyDialogV2();
        }
    }
};


// ========================================
// 構成画面初期化
// 既存 initBuilder を上書き
// ========================================

initBuilder = function () {

    renderHousehold();

    const params = new URLSearchParams(
        window.location.search
    );

    if (params.get("missing") === "1") {

        byId("missing-only").checked = true;
    }

    document.querySelectorAll("[data-storage]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    storageType = button.dataset.storage;

                    document.querySelectorAll("[data-storage]")
                        .forEach(tab => {

                            tab.classList.toggle(
                                "active",
                                tab === button
                            );
                        });

                    refreshBuilder();
                }
            );
        });

    byId("missing-only").addEventListener(
        "change",
        () => {

            if (builderResultV2) {
                renderBuilder(builderResultV2);
            }
        }
    );

    byId("category-filter").addEventListener(
        "change",
        () => {

            if (builderResultV2) {
                renderBuilder(builderResultV2);
            }
        }
    );

    byId("sort-by").addEventListener(
        "change",
        event => {

            sortBy = event.target.value;

            refreshBuilder();
        }
    );

    document.querySelectorAll("[data-view]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    builderViewV2 = button.dataset.view;

                    document.querySelectorAll("[data-view]")
                        .forEach(tab => {

                            tab.classList.toggle(
                                "active",
                                tab === button
                            );
                        });

                    if (builderResultV2) {

                        renderBuilder(builderResultV2);
                    }
                }
            );
        });

    byId("dialog-close").addEventListener(
        "click",
        closeSupplyDialogV2
    );

    byId("dialog-done").addEventListener(
        "click",
        closeSupplyDialogV2
    );

    byId("supply-dialog").addEventListener(
        "close",
        () => {

            openedItemIdV2 = null;
        }
    );

    refreshBuilder().then(() => {

        const category = params.get("category");

        if (
            category &&
            builderResultV2
        ) {

            const select = byId("category-filter");

            const exists = Array.from(select.options)
                .some(option => option.value === category);

            if (exists) {

                select.value = category;

                renderBuilder(builderResultV2);
            }
        }
    });
};


// ========================================
// ダッシュボード
// 全体の準備率
// ========================================

function renderOverallReadinessV2(items) {

    const total = items.length;

    const completed = items.filter(
        item => Number(item.shortage) <= 0
    ).length;

    const rate = total
        ? Math.round(completed / total * 100)
        : 0;

    setText(
        "overall-rate",
        total ? `${rate}%` : "-"
    );

    setText(
        "overall-detail",
        `${total}種類のうち${completed}種類を準備できています。`
    );

    const ring = byId("readiness-ring");

    ring.style.setProperty(
        "--rate",
        `${rate}%`
    );

    let message = "少しずつ備えを整えましょう";

    if (rate >= 100 && total > 0) {

        message = "必要な防災用品がそろいました！";

    } else if (rate >= 75) {

        message = "準備がかなり進んでいます";

    } else if (rate >= 50) {

        message = "半分以上の用品を準備できています";

    } else if (rate >= 25) {

        message = "着実に準備が進んでいます";
    }

    setText("readiness-message", message);
}


// ========================================
// 優先用品カード
// ========================================

function renderPriorityItemsV2(items) {

    const container = byId("priority-items");

    container.replaceChildren();

    const priorityNames = [
        "飲料水",
        "非常食",
        "携帯トイレ"
    ];

    priorityNames.forEach(name => {

        const item = items.find(
            entry => entry.name === name
        );

        if (!item) return;

        const design = getCategoryDesign(
            item.category
        );

        const card = createElement(
            "article",
            "priority-card"
        );

        card.dataset.category = design.key;

        const heading = createElement(
            "div",
            "priority-card-header"
        );

        heading.append(

            createDesignIcon(
                ITEM_DESIGN_ICONS[item.name] ||
                design.icon,
                "category-icon"
            ),

            createElement(
                "span",
                "",
                item.name
            )
        );

        const status = createElement(
            "div",

            item.shortage > 0
                ? "priority-status text-shortage"
                : "priority-status text-success",

            item.shortage > 0
                ? `あと${format(item.shortage)}${item.unit}`
                : "✓ 準備完了"
        );

        const detail = createElement(
            "a",
            "supply-detail-button",
            "用品を確認する"
        );

        detail.href =
            "/builder?category=" +
            encodeURIComponent(item.category);

        detail.style.textAlign = "center";

        card.append(

            heading,

            status,

            createDesignProgress(
                getItemPreparationRate(item)
            ),

            createElement(
                "div",
                "muted",
                `${format(item.owned)} / ` +
                `${format(item.quantity)}${item.unit}`
            ),

            detail
        );

        container.appendChild(card);
    });
}


// ========================================
// カテゴリ別準備状況
// 既存 renderCategoryProgress を上書き
// ========================================

renderCategoryProgress = function (items) {

    const container = byId("category-progress");

    container.replaceChildren();

    const categories = new Map();

    items.forEach(item => {

        if (!categories.has(item.category)) {

            categories.set(
                item.category,
                {
                    total: 0,
                    completed: 0
                }
            );
        }

        const category = categories.get(item.category);

        category.total++;

        if (Number(item.shortage) <= 0) {

            category.completed++;
        }
    });

    categories.forEach((category, name) => {

        const design = getCategoryDesign(name);

        const rate = Math.round(
            category.completed / category.total * 100
        );

        const card = createElement(
            "a",
            "dashboard-category-card"
        );

        card.dataset.category = design.key;

        card.href =
            "/builder?category=" +
            encodeURIComponent(name);

        card.append(

            createDesignIcon(
                design.icon,
                "category-icon"
            ),

            createElement(
                "div",
                "dashboard-category-name",
                name
            ),

            createElement(
                "div",
                "dashboard-category-count",
                `${category.completed} / ` +
                `${category.total}種類 準備完了`
            ),

            createDesignProgress(rate)
        );

        container.appendChild(card);
    });
};


// ========================================
// ダッシュボード初期化
// 既存 initDashboard を上書き
// ========================================

initDashboard = async function () {

    renderHousehold();

    try {

        const result = await fetchCalculation();

        renderOverallReadinessV2(result.items);

        renderPreparationRate(
            result.items,
            "home"
        );

        renderPreparationRate(
            result.items,
            "go"
        );

        renderPriorityItemsV2(result.items);

        renderCategoryProgress(result.items);

        const shortages = result.items.filter(
            item => Number(item.shortage) > 0
        ).length;

        setText(
            "shortage-count",
            `${shortages}種類`
        );

    } catch (error) {

        showError(error.message);
    }
};

// ========================================
// Disaster Builder v3
// 複数商品の購入構成
// ========================================

const PURCHASE_PLAN_KEY =
    "disaster_builder_purchase_plan_v1";

let purchasePlansV3 = loadObject(
    PURCHASE_PLAN_KEY
);


// ========================================
// 購入数の正規化
// ========================================

function normalizePlanCountV3(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(99999, Math.floor(number))
    );
}


// ========================================
// 自動選択
// ========================================

function createAutoPlanV3(item) {

    const options = item.product_options || [];

    const candidates = options.map(product => {

        const quantity = Number(
            product.quantity_per_package
        );

        if (!(quantity > 0)) {
            return null;
        }

        const count = Math.ceil(
            item.shortage / quantity
        );

        return {

            id: product.id,

            count: count,

            subtotal: product.price == null
                ? Infinity
                : count * product.price,

            surplus:
                count * quantity - item.shortage
        };

    }).filter(Boolean);

    candidates.sort((a, b) => {

        if (a.subtotal !== b.subtotal) {
            return a.subtotal - b.subtotal;
        }

        if (a.surplus !== b.surplus) {
            return a.surplus - b.surplus;
        }

        return a.id - b.id;
    });

    if (
        !candidates.length ||
        item.shortage <= 0
    ) {
        return {};
    }

    const best = candidates[0];

    return {
        [best.id]: best.count
    };
}


// ========================================
// 保存済みの商品構成を取得
// ========================================

function getPurchasePlanV3(item) {

    const saved = purchasePlansV3[item.id];

    if (
        saved &&
        saved.mode === "manual"
    ) {

        return {
            mode: "manual",
            counts: {
                ...(saved.counts || {})
            }
        };
    }

    if (
        saved &&
        saved.mode === "auto"
    ) {

        return {
            mode: "auto",
            counts: createAutoPlanV3(item)
        };
    }

    // 旧バージョンで選択した商品を引き継ぐ

    const legacyId = selectedProducts[item.id];

    const legacyProduct =
        (item.product_options || []).find(
            product => product.id === legacyId
        );

    if (
        legacyProduct &&
        legacyProduct.quantity_per_package > 0
    ) {

        return {

            mode: "manual",

            counts: {

                [legacyProduct.id]: Math.ceil(

                    item.shortage /
                    legacyProduct.quantity_per_package
                )
            }
        };
    }

    return {

        mode: "auto",

        counts: createAutoPlanV3(item)
    };
}


// ========================================
// 商品構成の集計
// ========================================

function calculatePurchasePlanV3(item, counts) {

    let quantity = 0;
    let knownTotal = 0;
    let hasUnknownPrice = false;
    let hasSample = false;

    const products = [];

    (item.product_options || []).forEach(product => {

        const count = normalizePlanCountV3(
            counts[product.id]
        );

        if (count <= 0) {
            return;
        }

        const purchaseQuantity =
            count * product.quantity_per_package;

        const subtotal = product.price == null
            ? null
            : count * product.price;

        quantity += purchaseQuantity;

        if (subtotal === null) {

            hasUnknownPrice = true;

        } else {

            knownTotal += subtotal;
        }

        if (product.is_sample) {
            hasSample = true;
        }

        products.push({

            ...product,

            packages: count,

            purchase_quantity: purchaseQuantity,

            subtotal: subtotal
        });
    });

    const shortage = Number(item.shortage);

    return {

        products: products,

        quantity: quantity,

        shortage: shortage,

        remaining: Math.max(
            0,
            shortage - quantity
        ),

        surplus: Math.max(
            0,
            quantity - shortage
        ),

        knownTotal: knownTotal,

        total: hasUnknownPrice
            ? null
            : knownTotal,

        hasUnknownPrice: hasUnknownPrice,

        hasSample: hasSample
    };
}


// ========================================
// 商品構成の保存
// ========================================

function savePurchasePlanV3(itemId, mode, counts) {

    const cleanCounts = {};

    Object.entries(counts).forEach(([id, value]) => {

        const count = normalizePlanCountV3(value);

        if (count > 0) {
            cleanCounts[id] = count;
        }
    });

    const next = {

        ...purchasePlansV3,

        [itemId]: {

            mode: mode,

            counts: mode === "manual"
                ? cleanCounts
                : {}
        }
    };

    saveObject(
        PURCHASE_PLAN_KEY,
        next
    );

    purchasePlansV3 = next;
}


// ========================================
// 購入予定金額を計算結果に反映
// ========================================

function applyPurchasePlansV3(result) {

    let knownTotal = 0;
    let hasUnknownPrice = false;
    let hasSample = false;
    let remainingItemCount = 0;

    result.items.forEach(item => {

        const plan = getPurchasePlanV3(item);

        const counts = item.shortage > 0
            ? plan.counts
            : {};

        const summary = calculatePurchasePlanV3(
            item,
            counts
        );

        item.purchase_plan = {

            mode: plan.mode,

            counts: counts,

            ...summary
        };

        knownTotal += summary.knownTotal;

        if (summary.hasUnknownPrice) {
            hasUnknownPrice = true;
        }

        if (
            item.shortage > 0 &&
            !(item.product_options || []).length
        ) {
            hasUnknownPrice = true;
        }

        if (summary.hasSample) {
            hasSample = true;
        }

        if (summary.remaining > 0.000001) {
            remainingItemCount++;
        }
    });

    result.known_total_price = knownTotal;

    result.total_price = hasUnknownPrice
        ? null
        : knownTotal;

    result.has_unpriced_items = hasUnknownPrice;

    result.has_sample_products = hasSample;

    result.remaining_purchase_items =
        remainingItemCount;

    return result;
}


// ========================================
// 既存APIを再利用
// ========================================

const originalFetchCalculationV3 =
    fetchCalculation;

fetchCalculation = async function (
    storage = "all",
    sort = "category"
) {

    // 購入構成は自宅・持ち出し共通で管理する

    if (storage === "all") {

        const result =
            await originalFetchCalculationV3(
                "all",
                sort
            );

        return applyPurchasePlansV3(result);
    }

    const [result, allResult] = await Promise.all([

        originalFetchCalculationV3(
            storage,
            sort
        ),

        originalFetchCalculationV3(
            "all",
            sort
        )
    ]);

    applyPurchasePlansV3(allResult);

    const allItems = new Map(

        allResult.items.map(
            item => [item.id, item]
        )
    );

    result.items.forEach(item => {

        const allItem = allItems.get(item.id);

        if (!allItem) return;

        item.purchase_plan =
            allItem.purchase_plan;

        item.purchase_source = allItem;
    });

    // タブを切り替えても購入予定額は全体共通

    result.known_total_price =
        allResult.known_total_price;

    result.total_price =
        allResult.total_price;

    result.has_unpriced_items =
        allResult.has_unpriced_items;

    result.has_sample_products =
        allResult.has_sample_products;

    result.remaining_purchase_items =
        allResult.remaining_purchase_items;

    return result;
};


// ========================================
// 金額表示
// ========================================

const originalRenderPriceV3 = renderPrice;

renderPrice = function (prefix, result) {

    originalRenderPriceV3(prefix, result);

    const note = byId(`${prefix}-price-note`);

    if (!note) return;

    const notes = [];

    if (note.textContent) {
        notes.push(note.textContent);
    }

    if (result.remaining_purchase_items > 0) {

        notes.push(

            `購入予定を含めても不足する用品：` +
            `${result.remaining_purchase_items}種類`
        );
    }

    note.textContent = notes.join(" ／ ");
};

// ========================================
// 所有数量カード
// ========================================

function createOwnedStorageCardV3(item, type) {

    const isHome = type === "home";

    const title = isHome
        ? "自宅備蓄"
        : "非常持ち出し";

    const required = isHome
        ? item.home_required
        : item.go_required;

    const shortage = isHome
        ? item.home_shortage
        : item.go_shortage;

    const card = createElement(
        "div",
        "owned-storage-card"
    );

    const heading = createElement(
        "div",
        "owned-storage-heading"
    );

    heading.append(

        createDesignIcon(
            isHome ? "home" : "bag",
            "owned-storage-icon"
        ),

        createElement(
            "span",
            "",
            title
        )
    );

    const requiredText = createElement(
        "div",
        "owned-storage-required",
        `必要数量：${format(required)}${item.unit}`
    );

    const inputRow = createElement(
        "div",
        "owned-storage-input-row"
    );

    // 既存の所有数量入力処理を再利用

    const ownedInput = createOwnedInput(
        item,
        type
    );

    const input = ownedInput.querySelector(
        "input"
    );

    if (input) {

        input.setAttribute(
            "aria-label",
            `${title}の所有数量`
        );
    }

    inputRow.append(

        ownedInput,

        createElement(
            "span",
            "",
            item.unit
        )
    );

    const status = createElement(

        "div",

        shortage > 0
            ? "owned-storage-status text-shortage"
            : "owned-storage-status text-success",

        shortage > 0
            ? `あと${format(shortage)}${item.unit}`
            : "✓ 準備完了"
    );

    const quantityRow = createElement("div", "owned-storage-quantity-row");
    quantityRow.append(requiredText, status);
    card.append(heading, quantityRow, inputRow);

    return card;
}


// ========================================
// 商品画像
// ========================================

function createPlanProductImageV3(item, product) {

    const imageUrl = safeUrl(product.image_url);

    if (imageUrl) {

        const image = createElement(
            "img",
            "plan-product-image"
        );

        image.src = imageUrl;
        image.alt = product.name;
        image.loading = "lazy";

        return image;
    }

    return createDesignIcon(

        ITEM_DESIGN_ICONS[item.name] ||
        getCategoryDesign(item.category).icon,

        "plan-product-placeholder"
    );
}


// ========================================
// 集計用の行
// ========================================

function createPlanSummaryRowV3(
    label,
    value,
    color = ""
) {

    const row = createElement(
        "div",
        "plan-summary-row"
    );

    row.append(

        createElement(
            "span",
            "muted",
            label
        ),

        createElement(
            "strong",
            color,
            value
        )
    );

    return row;
}


// ========================================
// 商品構成の集計表示
// ========================================

function renderPlanSummaryV3(container, item, summary) {
    container.replaceChildren();
    const metrics = createElement("div", "plan-summary-metrics");
    function createMetric(label, value, color = "") {
        const metric = createElement("div", "plan-summary-metric");
        metric.append(
            createElement("div", "plan-summary-metric-label", label),
            createElement("div", `plan-summary-metric-value ${color}`, `${format(value)}${item.unit}`)
        );
        return metric;
    }
    metrics.append(createMetric("不足数量", summary.shortage), createMetric("購入予定", summary.quantity));
    if (summary.remaining > 0.000001) {
        metrics.append(createMetric("購入後の不足", summary.remaining, "text-shortage"));
    } else if (summary.surplus > 0.000001) {
        metrics.append(createMetric("購入後の余剰", summary.surplus, "text-success"));
    } else {
        metrics.append(createMetric("購入後の不足", 0, "text-success"));
    }
    container.append(metrics);
    const rate = summary.shortage > 0 ? summary.quantity / summary.shortage * 100 : 100;
    const progress = createDesignProgress(Math.min(100, Math.max(0, rate)));
    progress.classList.add("plan-summary-progress");
    container.append(progress);
    const totalRow = createElement("div", "plan-summary-total-v4");
    const totalInfo = createElement("div", "plan-summary-total-info");
    totalInfo.append(createElement("div", "plan-summary-total-label", summary.hasUnknownPrice ? "購入総額（判明分）" : "購入総額"));
    if (summary.hasUnknownPrice) totalInfo.append(createElement("div", "plan-summary-total-note", "価格未登録の商品を含みます"));
    if (summary.hasSample) totalInfo.append(createElement("div", "plan-summary-total-note", "仮商品・仮価格を含みます"));
    totalRow.append(totalInfo, createElement("div", "plan-summary-total-value", yen(summary.knownTotal)));
    container.append(totalRow);
}

// ========================================
// 選択済み商品を表示
// ========================================

function createPlanProductRowV3(item, product) {

    const row = createElement(
        "div",
        "plan-product-row"
    );

    const info = createElement(
        "div",
        "plan-product-info"
    );

    info.append(

        createElement(
            "div",
            "plan-product-name",
            product.name
        ),

        createElement(

            "div",

            "plan-product-description",

            `購入数：${format(product.packages)}` +
            ` × ${yen(product.price)}`
        ),

        createElement(

            "div",

            "plan-product-description",

            `購入予定数量：` +
            `${format(product.purchase_quantity)}` +
            item.unit
        )
    );

    if (product.is_sample) {

        info.appendChild(

            createElement(
                "div",
                "plan-product-description sample-note",
                "仮商品・仮価格"
            )
        );
    }

    row.append(

        createPlanProductImageV3(item, product),

        info,

        createElement(
            "div",
            "plan-product-price",
            yen(product.subtotal)
        )
    );

    return row;
}


// ========================================
// 詳細ダイアログ描画
// ========================================

renderSupplyDialogV2 = function (item) {

    const content = byId("dialog-content");

    if (!content) return;

    setText("dialog-title", item.name);

    content.replaceChildren();

    content.appendChild(
        createSupplyVisual(item)
    );

    const quantities = createElement(
        "div",
        "dialog-quantities"
    );

    const quantityData = [

        {
            label: "必要数量",
            value: item.quantity,
            color: ""
        },

        {
            label: "所有数量",
            value: item.owned,
            color: ""
        },

        {
            label: "不足数量",
            value: item.shortage,
            color: item.shortage > 0
                ? "text-shortage"
                : "text-success"
        }
    ];

    quantityData.forEach(data => {

        const box = createElement(
            "div",
            "dialog-quantity-box"
        );

        box.append(

            createElement(
                "div",
                "muted",
                data.label
            ),

            createElement(
                "div",
                `quantity-value ${data.color}`,
                `${format(data.value)}${item.unit}`
            )
        );

        quantities.appendChild(box);
    });

    content.append(

        quantities,

        createDesignProgress(
            getItemPreparationRate(item)
        ),

        createElement(
            "h3",
            "dialog-section-title",
            "所有数量の登録"
        )
    );

    const ownedWrapper = createElement(
        "div",
        "dialog-owned"
    );

    if (
        storageType !== "go" &&
        item.home_required > 0
    ) {

        ownedWrapper.appendChild(

            createOwnedStorageCardV3(
                item,
                "home"
            )
        );
    }

    if (
        storageType !== "home" &&
        item.go_required > 0
    ) {

        ownedWrapper.appendChild(

            createOwnedStorageCardV3(
                item,
                "go"
            )
        );
    }

    if (ownedWrapper.children.length === 1) {

        ownedWrapper.style.gridTemplateColumns =
            "1fr";
    }

    content.appendChild(ownedWrapper);


    // ====================================
    // 購入する商品
    // ====================================

    const purchaseItem =
        item.purchase_source || item;

    const plan = purchaseItem.purchase_plan;

    const productSection = createElement(
        "div",
        "dialog-product"
    );

    productSection.appendChild(

        createElement(
            "h3",
            "dialog-section-title",
            "購入する商品"
        )
    );

    if (storageType !== "all") {

        productSection.appendChild(

            createElement(

                "p",

                "muted",

                "購入構成は自宅備蓄・非常持ち出し共通です。"
            )
        );
    }

    if (purchaseItem.shortage <= 0) {

        productSection.appendChild(

            createElement(

                "p",

                "text-success",

                "必要数量を準備できています。"
            )
        );

        content.appendChild(productSection);

        return;
    }

    if (!(purchaseItem.product_options || []).length) {

        productSection.appendChild(

            createElement(

                "p",

                "muted",

                "購入候補の商品は未登録です。"
            )
        );

        content.appendChild(productSection);

        return;
    }

    const productList = createElement(
        "div",
        "plan-product-list"
    );

    if (plan && plan.products.length) {

        plan.products.forEach(product => {

            productList.appendChild(

                createPlanProductRowV3(
                    purchaseItem,
                    product
                )
            );
        });

    } else {

        productList.appendChild(

            createElement(

                "p",

                "muted",

                "購入予定の商品はありません。"
            )
        );
    }

    productSection.appendChild(productList);

    if (plan) {

        const summary = createElement(
            "div",
            "plan-detail-summary"
        );

        renderPlanSummaryV3(
            summary,
            purchaseItem,
            plan
        );

        productSection.appendChild(summary);
    }

    const actions = createElement(
        "div",
        "plan-detail-actions"
    );

    const changeButton = createElement(

        "button",

        "button button-outline",

        "商品構成を変更"
    );

    changeButton.type = "button";

    changeButton.addEventListener(
        "click",
        () => {

            openProductPlanDialogV3(
                purchaseItem
            );
        }
    );

    actions.appendChild(changeButton);

    productSection.appendChild(actions);

    content.appendChild(productSection);
};

// ========================================
// 商品構成ダイアログ
// ========================================

function openProductPlanDialogV3(item) {

    const existing = byId("product-plan-dialog");

    if (existing) {

        if (existing.open) {
            existing.close();
        }

        existing.remove();
    }

    const initialPlan = getPurchasePlanV3(item);

    let mode = initialPlan.mode;

    let counts = {
        ...initialPlan.counts
    };

    const dialog = createElement(
        "dialog",
        "product-plan-dialog"
    );

    dialog.id = "product-plan-dialog";

    const layout = createElement(
        "div",
        "product-plan-layout"
    );

    const header = createElement(
        "div",
        "product-plan-header"
    );

    const closeButton = createElement(
        "button",
        "dialog-close",
        "×"
    );

    closeButton.type = "button";

    closeButton.setAttribute(
        "aria-label",
        "閉じる"
    );

    closeButton.addEventListener(
        "click",
        () => dialog.close()
    );

    header.append(

        createElement(
            "h2",
            "",
            `${item.name}の商品選択`
        ),

        closeButton
    );

    const body = createElement(
        "div",
        "product-plan-body"
    );

    const context = createElement(
        "div",
        "product-plan-context",

        `必要数量：${format(item.quantity)}${item.unit}` +
        ` ／ 不足数量：${format(item.shortage)}${item.unit}`
    );

    const tools = createElement(
        "div",
        "product-plan-tools"
    );

    const autoButton = createElement(

        "button",

        "button button-outline",

        "自動選択（購入総額最安）"
    );

    autoButton.type = "button";

    const clearButton = createElement(

        "button",

        "button button-outline",

        "すべてクリア"
    );

    clearButton.type = "button";

    const modeLabel = createElement(
        "span",
        "product-plan-mode"
    );

    tools.append(

        autoButton,

        clearButton,

        modeLabel
    );

    const optionsContainer = createElement(
        "div",
        "product-plan-options"
    );

    const summaryContainer = createElement(
        "div",
        "product-plan-summary"
    );

    const footer = createElement(
        "div",
        "product-plan-footer"
    );

    const cancelButton = createElement(

        "button",

        "button button-outline",

        "キャンセル"
    );

    cancelButton.type = "button";

    cancelButton.addEventListener(
        "click",
        () => dialog.close()
    );

    const confirmButton = createElement(

        "button",

        "button",

        "この構成で確定する"
    );

    confirmButton.type = "button";

    const errorText = createElement(
        "p",
        "error"
    );

    footer.append(

        cancelButton,

        confirmButton
    );

    body.append(

        context,

        tools,

        optionsContainer,

        errorText
    );

    layout.append(

        header,

        body,

        summaryContainer,

        footer
    );

    dialog.appendChild(layout);


    // ====================================
    // 商品カードの状態
    // ====================================

    const optionViews = new Map();

    function updateSummary() {

        const summary = calculatePurchasePlanV3(
            item,
            counts
        );

        renderPlanSummaryV3(
            summaryContainer,
            item,
            { ...summary, hasSample: summary.hasSample || (item.product_options || []).some(product => product.is_sample) }
        );

        modeLabel.textContent =
            mode === "auto"
                ? "自動選択中"
                : "手動構成中";
    }


    function updateOption(product) {

        const view = optionViews.get(product.id);

        if (!view) return;

        const count = normalizePlanCountV3(
            counts[product.id]
        );

        view.card.classList.toggle(
            "selected",
            count > 0
        );

        view.input.value = count;

        view.minus.disabled = count <= 0;

        view.plus.disabled = count >= 99999;

        view.subtotal.hidden = false;

        view.quantity.textContent =

            `購入予定：` +

            `${format(
                count * product.quantity_per_package
            )}${item.unit}`;

        view.price.textContent = yen(

            product.price == null

                ? null

                : count * product.price
        );
    }


    function updateAllOptions() {

        (item.product_options || []).forEach(
            updateOption
        );

        updateSummary();
    }


    function changeCount(product, value) {

        mode = "manual";

        const count = normalizePlanCountV3(value);

        if (count > 0) {

            counts[product.id] = count;

        } else {

            delete counts[product.id];
        }

        updateOption(product);

        updateSummary();
    }


    // ====================================
    // 商品候補カード
    // ====================================

    function createOptionCard(product) {

        const card = createElement(
            "div",
            "plan-option-card"
        );

        const heading = createElement(
            "div",
            "plan-option-heading"
        );

        const info = createElement(
            "div",
            "plan-option-info"
        );

        const titleRow = createElement("div", "plan-option-title-row");
        titleRow.append(
            createElement("div", "plan-option-name", product.name),
            createElement("div", "plan-option-price", yen(product.price))
        );
        const specRow = createElement("div", "plan-option-spec-row");
        specRow.append(
            createElement("div", "plan-option-description", `内容量：${format(product.quantity_per_package)}${item.unit}`),
            createElement("div", "plan-option-description", product.unit_price == null ? "単価：未登録" : `単価：${yen(product.unit_price)} / ${item.unit}`)
        );
        info.append(titleRow, specRow);

        heading.append(

            createPlanProductImageV3(
                item,
                product
            ),

            info
        );


        // 購入数コントロール

        const counterRow = createElement(
            "div",
            "plan-counter-row"
        );

        const counter = createElement(
            "div",
            "plan-counter"
        );

        const minus = createElement(
            "button",
            "plan-counter-button",
            "−"
        );

        minus.type = "button";

        minus.setAttribute(
            "aria-label",
            `${product.name}の購入数を減らす`
        );

        const input = createElement(
            "input",
            "plan-counter-value"
        );

        input.type = "number";
        input.min = "0";
        input.max = "99999";
        input.step = "1";

        input.setAttribute(
            "aria-label",
            `${product.name}の購入数`
        );

        const plus = createElement(
            "button",
            "plan-counter-button",
            "+"
        );

        plus.type = "button";

        plus.setAttribute(
            "aria-label",
            `${product.name}の購入数を増やす`
        );

        minus.addEventListener(
            "click",
            () => {

                changeCount(

                    product,

                    normalizePlanCountV3(
                        counts[product.id]
                    ) - 1
                );
            }
        );

        plus.addEventListener(
            "click",
            () => {

                changeCount(

                    product,

                    normalizePlanCountV3(
                        counts[product.id]
                    ) + 1
                );
            }
        );

        input.addEventListener(
            "change",
            () => {

                changeCount(
                    product,
                    input.value
                );
            }
        );

        counter.append(

            minus,

            input,

            plus
        );

        counterRow.append(

            createElement(
                "span",
                "muted",
                "購入数"
            ),

            counter
        );


        // 商品ごとの購入数量と小計

        const subtotal = createElement(
            "div",
            "plan-option-subtotal"
        );

        const quantity = createElement(
            "span",
            "muted"
        );

        const price = createElement(
            "strong"
        );

        subtotal.append(

            quantity,

            price
        );

        counterRow.append(subtotal);
        card.append(heading, counterRow);

        optionViews.set(

            product.id,

            {
                card,
                input,
                minus,
                plus,
                subtotal,
                quantity,
                price
            }
        );

        updateOption(product);

        return card;
    }


    // ====================================
    // 商品候補を描画
    // ====================================

    (item.product_options || []).forEach(product => {

        optionsContainer.appendChild(

            createOptionCard(product)
        );
    });


    // ====================================
    // 自動選択
    // ====================================

    autoButton.addEventListener(
        "click",
        () => {

            mode = "auto";

            counts = createAutoPlanV3(item);

            updateAllOptions();
        }
    );


    // ====================================
    // すべてクリア
    // ====================================

    clearButton.addEventListener(
        "click",
        () => {

            mode = "manual";

            counts = {};

            updateAllOptions();
        }
    );


    // ====================================
    // 構成の確定
    // ====================================

    confirmButton.addEventListener(
        "click",
        async () => {

            errorText.textContent = "";

            confirmButton.disabled = true;

            try {

                savePurchasePlanV3(

                    item.id,

                    mode,

                    counts
                );

                dialog.close();

                await refreshBuilder();

            } catch (error) {

                errorText.textContent =

                    "商品構成を保存できませんでした。";

                confirmButton.disabled = false;
            }
        }
    );


    // ====================================
    // ダイアログ表示
    // ====================================

    dialog.addEventListener(
        "close",
        () => dialog.remove(),
        { once: true }
    );

    document.body.appendChild(dialog);

    updateSummary();

    dialog.showModal();
}

// ========================================
// 購入リスト v3
// ========================================

initShopping = async function () {

    try {

        const result = await fetchCalculation();

        renderPrice(
            "shopping",
            result
        );

        const container = byId(
            "shopping-items"
        );

        container.replaceChildren();

        const items = result.items.filter(

            item => item.shortage > 0
        );

        if (!items.length) {

            container.appendChild(

                createElement(

                    "p",

                    "muted",

                    "現在、不足している用品はありません。"
                )
            );

            return;
        }

        items.forEach(item => {

            const plan = item.purchase_plan;

            const card = createElement(
                "div",
                "shopping-plan-card"
            );

            const heading = createElement(
                "div",
                "shopping-plan-heading"
            );

            const editLink = createElement(

                "a",

                "button button-outline",

                "商品構成を変更"
            );

            editLink.href =

                "/builder?category=" +

                encodeURIComponent(item.category);

            heading.append(

                createElement(
                    "h3",
                    "",
                    item.name
                ),

                editLink
            );

            card.appendChild(heading);

            card.appendChild(

                createElement(

                    "div",

                    "text-shortage",

                    `現在の不足数量：` +
                    `${format(item.shortage)}${item.unit}`
                )
            );

            if (!plan || !plan.products.length) {

                card.appendChild(

                    createElement(

                        "p",

                        "muted",

                        (item.product_options || []).length

                            ? "購入予定の商品はありません。"

                            : "購入候補の商品は未登録です。"
                    )
                );

            } else {

                plan.products.forEach(product => {

                    const row =
                        createPlanProductRowV3(
                            item,
                            product
                        );

                    const url = safeUrl(product.url);

                    if (url) {

                        const link = createElement(

                            "a",

                            "button button-outline",

                            "購入先を見る"
                        );

                        link.href = url;

                        link.target = "_blank";

                        link.rel =
                            "noopener noreferrer sponsored";

                        row.appendChild(link);
                    }

                    card.appendChild(row);
                });
            }

            if (plan) {

                const summary = createElement(

                    "div",

                    "plan-detail-summary"
                );

                renderPlanSummaryV3(
                    summary,
                    item,
                    plan
                );

                card.appendChild(summary);
            }

            container.appendChild(card);
        });

    } catch (error) {

        showError(error.message);
    }
};


// ========================================
// 構成画面の購入金額ラベル
// ========================================

const previousInitBuilderV3 = initBuilder;

initBuilder = function () {

    previousInitBuilderV3();

    const label = document.querySelector(

        ".purchase-summary .metric-label"
    );

    if (label) {

        label.textContent =

            "不足用品の購入予定総額（全体）";
    }
};