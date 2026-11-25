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