"use strict";

// ========================================
// 備蓄管理データ
// ========================================

const STOCK_KEY = "disaster_builder_inventory_v1";

let stockData = loadObject(STOCK_KEY);

if (!Array.isArray(stockData.lots)) {
    stockData.lots = [];
}

if (!Array.isArray(stockData.history)) {
    stockData.history = [];
}

if (!Array.isArray(stockData.managedIds)) {
    stockData.managedIds = [];
}

let stockItems = [];
let stockExpanded = new Set();
let stockEditState = null;


// ========================================
// カテゴリカラー
// ========================================

const STOCK_COLORS = {
    "飲料水・食料": ["#e3eddf", "#638d7d"],
    "トイレ・衛生": ["#e2edf2", "#608697"],
    "照明・電源": ["#f3ead1", "#9c8650"],
    "防寒・生活": ["#f3e4da", "#a47e65"],
    "避難用品": ["#dce7cf", "#758c57"],
    "医療・救急": ["#f3e1e1", "#ad7474"],
    "情報・通信": ["#e9e4f2", "#8a7ca6"],
    "調理・生活用品": ["#f2ead9", "#a28b62"],
    "乳幼児用品": ["#f4e4ed", "#ae7c98"],
    "高齢者用品": ["#e0e9e9", "#648b8c"],
    "ペット用品": ["#eaddd2", "#9a7962"]
};


// ========================================
// 共通処理
// ========================================

function stockToday() {

    const date = new Date();

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}


function stockFutureDate(days) {

    const date = new Date();

    date.setDate(date.getDate() + days);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}


function stockNewId() {

    return globalThis.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


function stockClone(data) {

    return JSON.parse(JSON.stringify(data));
}


function stockQuantity(value) {

    return Math.round(Number(value) * 1000000)
        / 1000000;
}


function stockGetLots(itemId) {

    return stockData.lots.filter(
        lot => String(lot.itemId) === String(itemId)
    );
}


function stockIsManaged(itemId) {

    return stockData.managedIds.some(
        id => String(id) === String(itemId)
    );
}


// ========================================
// 期限判定
// ========================================

function stockLotStatus(lot) {

    if (lot.expiryMode === "legacy") {
        return "legacy";
    }

    if (lot.expiryMode === "none") {
        return "valid";
    }

    if (
        lot.expiryMode !== "date" ||
        !lot.expiry
    ) {
        return "unknown";
    }

    if (lot.expiry < stockToday()) {
        return "expired";
    }

    if (lot.expiry <= stockFutureDate(30)) {
        return "soon";
    }

    return "valid";
}


// ========================================
// 備蓄数量の計算
//
// 期限未確認の商品も暫定的に含める。
// 期限切れの商品だけを除外する。
// ========================================

function stockValidQuantity(itemId) {

    return stockQuantity(

        stockGetLots(itemId)
            .filter(lot => {

                const status = stockLotStatus(lot);

                return (
                    status === "valid" ||
                    status === "soon" ||
                    status === "legacy" ||
                    status === "unknown"
                );
            })
            .reduce(
                (total, lot) =>
                    total + Number(lot.quantity),
                0
            )
    );
}


function stockPhysicalQuantity(itemId) {

    return stockQuantity(

        stockGetLots(itemId).reduce(
            (total, lot) =>
                total + Number(lot.quantity),
            0
        )
    );
}


function stockShortage(item) {

    return Math.max(
        0,
        stockQuantity(
            item.home_required -
            stockValidQuantity(item.id)
        )
    );
}


// ========================================
// ステータス別数量
// ========================================

function stockStatusQuantity(itemId, status) {

    return stockQuantity(

        stockGetLots(itemId)

            .filter(
                lot => stockLotStatus(lot) === status
            )

            .reduce(
                (total, lot) =>
                    total + Number(lot.quantity),
                0
            )
    );
}


// ========================================
// 保存処理
// ========================================

function stockSave(nextData) {

    saveObject(STOCK_KEY, nextData);

    stockData = nextData;

    stockSyncOwned();
}


function stockSyncOwned() {

    stockData.managedIds.forEach(itemId => {

        ownedHome[itemId] =
            stockValidQuantity(itemId);
    });
}


// ========================================
// 既存の所有数量を移行
// ========================================

function stockMigrate(items) {

    const next = stockClone(stockData);

    let changed = false;

    items.forEach(item => {

        const itemId = String(item.id);

        if (stockIsManaged(itemId)) {
            return;
        }

        const quantity = Number(
            ownedHome[itemId] || 0
        );

        next.managedIds.push(itemId);

        changed = true;

        if (quantity <= 0) {
            return;
        }

        next.lots.push({

            id: stockNewId(),

            itemId,

            name: `${item.name}（簡易登録）`,

            quantity,

            purchased: "",

            expiry: "",

            expiryMode: "legacy",

            location: "",

            createdAt: new Date().toISOString()
        });
    });

    if (changed) {
        stockSave(next);
    }
}


// ========================================
// 既存の計算APIとの連携
// ========================================

const stockPreviousFetchCalculation =
    fetchCalculation;

fetchCalculation = async function (
    storage = "all",
    sort = "category"
) {

    stockSyncOwned();

    return stockPreviousFetchCalculation(
        storage,
        sort
    );
};


// ========================================
// 構成画面との連携
// ========================================

const stockPreviousCreateOwnedInput =
    createOwnedInput;

createOwnedInput = function (item, type) {

    const input =
        stockPreviousCreateOwnedInput(item, type);

    if (
        type === "home" &&
        stockIsManaged(item.id)
    ) {

        const wrapper = createElement("div");

        const managedInput =
            input.cloneNode(true);

        const field =
            managedInput.matches("input")
                ? managedInput
                : managedInput.querySelector("input");

        if (field) {

            field.readOnly = true;

            field.value =
                stockValidQuantity(item.id);

            field.title =
                "自宅備蓄管理画面で数量を変更できます";
        }

        const link = createElement(
            "a",
            "stock-muted",
            "備蓄管理で編集"
        );

        link.href =
            `/stock?item=${encodeURIComponent(item.id)}`;

        link.style.display = "block";

        link.style.fontSize = "12px";

        link.style.marginTop = "4px";

        wrapper.append(
            managedInput,
            link
        );

        return wrapper;
    }

    return input;
};


// ========================================
// ボタン生成
// ========================================

function stockButton(label, callback) {

    const button = createElement(
        "button",
        "stock-small-button",
        label
    );

    button.type = "button";

    button.addEventListener(
        "click",
        callback
    );

    return button;
}


// ========================================
// プログレスバー生成
// ========================================

function stockCreateProgress(value, required) {

    const progress = createElement(
        "div",
        "stock-progress"
    );

    const fill = createElement(
        "div",
        "stock-progress-fill"
    );

    const rate = required > 0

        ? Math.min(
            100,
            Math.max(0, value / required * 100)
        )

        : 100;

    fill.style.width = `${rate}%`;

    progress.appendChild(fill);

    progress.setAttribute(
        "role",
        "progressbar"
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
        String(Math.round(rate))
    );

    return progress;
}


// ========================================
// フィルター判定
// ========================================

function stockMatchesFilter(item, filter) {

    if (filter === "all") {
        return true;
    }

    if (filter === "short") {
        return stockShortage(item) > 0;
    }

    return stockGetLots(item.id).some(lot => {

        const status = stockLotStatus(lot);

        if (filter === "unknown") {

            return (
                status === "unknown" ||
                status === "legacy"
            );
        }

        if (filter === "expiry") {

            return status !== "valid";
        }

        return status === filter;
    });
}


// ========================================
// 上部集計
// ========================================

function stockRenderMetrics() {

    const total = stockItems.length;

    const completed = stockItems.filter(
        item => stockShortage(item) <= 0
    ).length;

    const shortage = total - completed;

    const lots = stockItems.flatMap(
        item => stockGetLots(item.id)
    );

    const expired = lots.filter(
        lot => stockLotStatus(lot) === "expired"
    ).length;

    const soon = lots.filter(
        lot => stockLotStatus(lot) === "soon"
    ).length;

    const unknown = lots.filter(lot => {

        const status = stockLotStatus(lot);

        return (
            status === "unknown" ||
            status === "legacy"
        );

    }).length;

    setText(
        "stock-completed",
        String(completed)
    );

    setText(
        "stock-required-types",
        `/ ${total}種類`
    );

    setText(
        "stock-shortage",
        `残り${shortage}種類`
    );

    setText(
        "stock-expired",
        String(expired)
    );

    setText(
        "stock-expiring",
        String(soon)
    );

    setText(
        "stock-unknown",
        String(unknown)
    );

    const rate = total > 0
        ? completed / total * 100
        : 0;

    byId("stock-preparation-progress")
        .style.width = `${rate}%`;

    stockUpdateMetricSelection();
}


// ========================================
// 上部集計の選択状態
// ========================================

function stockUpdateMetricSelection() {

    const filter =
        byId("stock-filter").value;

    document.querySelectorAll(
        "[data-stock-filter]"
    ).forEach(button => {

        const active =
            button.dataset.stockFilter === filter;

        button.classList.toggle(
            "is-active",
            active
        );

        button.setAttribute(
            "aria-pressed",
            String(active)
        );
    });
}


// ========================================
// 上部集計からの絞り込み
// ========================================

function stockSelectMetric(filter) {

    const select = byId("stock-filter");

    select.value =

        select.value === filter

            ? "all"

            : filter;

    // 集計は全カテゴリが対象なので
    // カテゴリの絞り込みを解除する

    byId("stock-category").value = "all";

    stockExpandFilteredItems();

    stockRender();
}


function stockExpandFilteredItems() {

    const filter =
        byId("stock-filter").value;

    if (
        filter === "expired" ||
        filter === "soon" ||
        filter === "unknown" ||
        filter === "expiry"
    ) {

        stockItems.forEach(item => {

            if (stockMatchesFilter(item, filter)) {

                stockExpanded.add(
                    String(item.id)
                );
            }
        });
    }
}


// ========================================
// 登録済み商品行
// ========================================

function stockCreateLotRow(item, lot) {

    const row = createElement(
        "div",
        "stock-lot"
    );

    const info = createElement(
        "div",
        "stock-lot-info"
    );

    const status = stockLotStatus(lot);

    const details = createElement(
        "div",
        "stock-lot-details"
    );

    details.appendChild(

        createElement(
            "span",
            "",
            `購入日：${lot.purchased || "未登録"}`
        )
    );

    let expiryText = "";
    let expiryClass = "";

    switch (status) {

        case "expired":

            expiryText =
                `期限：${lot.expiry}（期限切れ）`;

            expiryClass = "stock-danger";

            break;

        case "soon":

            expiryText =
                `期限：${lot.expiry}（期限間近）`;

            expiryClass = "stock-shortage";

            break;

        case "unknown":

            expiryText = "期限未確認";

            expiryClass = "stock-warning";

            break;

        case "legacy":

            expiryText = "詳細未確認";

            expiryClass = "stock-warning";

            break;

        default:

            expiryText =

                lot.expiryMode === "none"

                    ? "期限管理対象外"

                    : `期限：${lot.expiry}`;
    }

    details.appendChild(

        createElement(
            "span",
            expiryClass,
            expiryText
        )
    );

    if (lot.location) {

        details.appendChild(

            createElement(
                "span",
                "",
                `保管場所：${lot.location}`
            )
        );
    }

    info.append(

        createElement(
            "div",
            "stock-lot-name",
            lot.name
        ),

        details
    );


    // ====================================
    // 右側：数量・操作ボタン
    // ====================================

    const right = createElement(
        "div",
        "stock-lot-right"
    );

    const quantity = createElement(
        "div",
        "stock-lot-quantity",
        `${format(lot.quantity)}${item.unit}`
    );

    const actions = createElement(
        "div",
        "stock-lot-actions"
    );

    actions.append(

        stockButton(
            "消費・廃棄",
            () => stockOpenDialog(
                "consume",
                item.id,
                lot.id
            )
        ),

        stockButton(
            "編集",
            () => stockOpenDialog(
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
// 注意書き生成
// ========================================

function stockCreateNotice(item) {

    const itemId = String(item.id);

    const physical =
        stockPhysicalQuantity(itemId);

    const expired =
        stockStatusQuantity(itemId, "expired");

    const unknown =
        stockStatusQuantity(itemId, "unknown");

    const legacy =
        stockStatusQuantity(itemId, "legacy");

    const parts = [];

    if (expired > 0) {

        parts.push(
            `実所有${format(physical)}${item.unit}`
        );

        parts.push(
            `期限切れ${format(expired)}${item.unit}（集計対象外）`
        );
    }

    if (unknown > 0) {

        parts.push(
            `期限未確認${format(unknown)}${item.unit}（暫定集計）`
        );
    }

    if (legacy > 0) {

        parts.push(
            `簡易登録${format(legacy)}${item.unit}・詳細要確認`
        );
    }

    if (parts.length === 0) {
        return null;
    }

    const notice = createElement(
        "div",
        "stock-notice",
        parts.join("・")
    );

    notice.title =
        "期限切れの商品は備蓄数量から除外しています。" +
        "期限未確認・簡易登録の商品は暫定的に備蓄数量に含めています。" +
        "実際の使用期限を確認してください。";

    return notice;
}


// ========================================
// 備蓄用品カード
// ========================================

function stockCreateCard(item) {

    const itemId = String(item.id);

    const lots = stockGetLots(itemId);

    const valid = stockValidQuantity(itemId);

    const shortage = stockShortage(item);

    const required = item.home_required;

    const isExpanded =
        stockExpanded.has(itemId);

    const colors =
        STOCK_COLORS[item.category]
        || ["#e3eddf", "#638d7d"];

    const card = createElement(
        "article",
        "stock-card"
    );

    card.id = `stock-card-${itemId}`;


    // ====================================
    // カード見出し
    // ====================================

    const heading = createElement(
        "div",
        "stock-card-heading"
    );

    const design = getCategoryDesign(
        item.category
    );

    const icon = createDesignIcon(

        ITEM_DESIGN_ICONS[item.name]
            || design.icon,

        "stock-card-icon"
    );

    icon.style.background = colors[0];

    icon.style.color = colors[1];

    const title = createElement(
        "div",
        "stock-card-title"
    );

    const category = createElement(
        "div",
        "stock-category-name",
        item.category
    );

    category.style.color = colors[1];

    title.append(

        category,

        createElement(
            "h3",
            "",
            item.name
        )
    );

    const status = createElement(

        "div",

        shortage > 0

            ? "stock-card-status stock-shortage"

            : "stock-card-status stock-success",

        shortage > 0

            ? `あと${format(shortage)}${item.unit}`

            : "✓ 準備完了"
    );

    const toggle = createElement(
        "button",
        "stock-card-toggle",
        isExpanded ? "⌃" : "⌄"
    );

    toggle.type = "button";

    toggle.setAttribute(
        "aria-expanded",
        String(isExpanded)
    );

    toggle.setAttribute(
        "aria-label",
        `${item.name}の詳細を開閉`
    );

    toggle.addEventListener(
        "click",
        () => {

            if (stockExpanded.has(itemId)) {

                stockExpanded.delete(itemId);

            } else {

                stockExpanded.add(itemId);
            }

            card.replaceWith(
                stockCreateCard(item)
            );
        }
    );

    heading.append(
        icon,
        title,
        status,
        toggle
    );


    // ====================================
    // プログレスバーと数量を横並び
    // ====================================

    const quantityRow = createElement(
        "div",
        "stock-quantity-row"
    );

    const progress = stockCreateProgress(
        valid,
        required
    );

    const quantityValue = createElement(
        "div",
        "stock-quantity-value"
    );

    quantityValue.title =
        "備蓄数量（期限未確認の暫定集計を含む） / 必要数量";

    quantityValue.append(

        createElement(
            "strong",
            "",
            `${format(valid)}${item.unit}`
        ),

        createElement(
            "span",
            "stock-muted",
            `/ ${format(required)}${item.unit}`
        )
    );

    quantityRow.append(
        progress,
        quantityValue
    );

    card.append(
        heading,
        quantityRow
    );


    // ====================================
    // 登録済み商品一覧
    // ====================================

    if (isExpanded) {

        const section = createElement(
            "div",
            "stock-lots"
        );

        const sectionHeading = createElement(
            "div",
            "stock-lots-heading"
        );

        sectionHeading.append(

            createElement(
                "span",
                "stock-muted",
                `登録済み商品（${lots.length}件）`
            ),

            stockButton(
                "＋ 追加登録",
                () => stockOpenDialog(
                    "add",
                    itemId
                )
            )
        );

        section.appendChild(sectionHeading);

        if (lots.length === 0) {

            section.appendChild(

                createElement(
                    "p",
                    "stock-muted",
                    "まだ備蓄が登録されていません。"
                )
            );
        }

        // 期限が近い順に表示

        const sortedLots = [...lots].sort(

            (a, b) =>

                (a.expiry || "9999-12-31")
                    .localeCompare(
                        b.expiry || "9999-12-31"
                    )
        );

        sortedLots.forEach(lot => {

            section.appendChild(
                stockCreateLotRow(item, lot)
            );
        });

        const notice = stockCreateNotice(item);

        if (notice) {

            section.appendChild(notice);
        }

        card.appendChild(section);
    }

    return card;
}


// ========================================
// 画面描画
// ========================================

function stockRender() {

    stockRenderMetrics();

    const container = byId("stock-items");

    const category =
        byId("stock-category").value;

    const filter =
        byId("stock-filter").value;

    const visible = stockItems.filter(item => {

        if (
            category !== "all" &&
            item.category !== category
        ) {
            return false;
        }

        return stockMatchesFilter(
            item,
            filter
        );
    });

    container.replaceChildren();

    if (visible.length === 0) {

        container.appendChild(

            createElement(
                "div",
                "stock-empty",
                "該当する用品はありません。"
            )
        );

        return;
    }

    visible.forEach(item => {

        container.appendChild(
            stockCreateCard(item)
        );
    });
}


// ========================================
// ダイアログ
// ========================================

function stockUpdateUnit() {

    const itemId =
        byId("stock-item").value;

    const item = stockItems.find(
        item => String(item.id) === itemId
    );

    setText(
        "stock-unit",
        item ? `（${item.unit}）` : ""
    );
}


function stockUpdateExpiryField() {

    const enabled =

        byId("stock-expiry-mode").value === "date"

        && stockEditState?.mode !== "consume";

    byId("stock-expiry-field").hidden = !enabled;

    byId("stock-expiry").required = enabled;
}


function stockOpenDialog(
    mode,
    itemId = null,
    lotId = null
) {

    const form = byId("stock-form");

    form.reset();

    setText("stock-dialog-error", "");

    stockEditState = {
        mode,
        itemId,
        lotId
    };

    const lot = stockData.lots.find(
        lot => lot.id === lotId
    );

    const consuming = mode === "consume";

    if (
        (mode === "consume" || mode === "edit") &&
        !lot
    ) {

        setText(
            "stock-error",
            "対象の商品が見つかりません。"
        );

        return;
    }

    const select = byId("stock-item");

    select.replaceChildren();

    stockItems.forEach(item => {

        const option = createElement(
            "option",
            "",
            `${item.category} / ${item.name}`
        );

        option.value = String(item.id);

        select.appendChild(option);
    });

    if (itemId !== null) {

        select.value = String(itemId);
    }

    select.disabled = itemId !== null;

    byId("stock-detail-fields").hidden = consuming;

    byId("stock-date-fields").hidden = consuming;

    byId("stock-reason-field").hidden = !consuming;

    const quantity = byId("stock-quantity");

    quantity.value = consuming

        ? Math.min(1, Number(lot.quantity))

        : lot?.quantity ?? 1;

    if (consuming) {

        quantity.max = lot.quantity;

    } else {

        quantity.removeAttribute("max");
    }

    byId("stock-name").value =
        lot?.name || "";

    byId("stock-purchased").value =
        lot?.purchased || "";

    byId("stock-expiry").value =
        lot?.expiry || "";

    byId("stock-expiry-mode").value =

        lot?.expiryMode === "legacy"

            ? "unknown"

            : lot?.expiryMode || "unknown";

    byId("stock-location").value =
        lot?.location || "";

    setText(

        "stock-dialog-title",

        consuming

            ? "消費・廃棄の登録"

            : mode === "edit"

                ? "備蓄情報の編集"

                : "備蓄の追加登録"
    );

    setText(

        "stock-submit",

        consuming

            ? "数量を減らす"

            : "登録する"
    );

    stockUpdateUnit();

    stockUpdateExpiryField();

    byId("stock-dialog").showModal();
}


// ========================================
// 登録・編集・消費・廃棄
// ========================================

function stockSubmit(event) {

    event.preventDefault();

    setText("stock-dialog-error", "");

    try {

        const state = stockEditState;

        const itemId =
            byId("stock-item").value;

        const item = stockItems.find(
            item => String(item.id) === itemId
        );

        if (!item || !state) {

            throw new Error(
                "用品を選択してください。"
            );
        }

        const quantity = stockQuantity(
            byId("stock-quantity").value
        );

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            throw new Error(
                "数量は0より大きくしてください。"
            );
        }

        const next = stockClone(stockData);

        const index = next.lots.findIndex(
            lot => lot.id === state.lotId
        );

        const before = index >= 0

            ? stockClone(next.lots[index])

            : null;

        let after = null;

        let action = state.mode;


        // =================================
        // 消費・廃棄
        // =================================

        if (state.mode === "consume") {

            if (!before) {

                throw new Error(
                    "対象の商品が見つかりません。"
                );
            }

            if (quantity > before.quantity) {

                throw new Error(
                    "所有数量を超えています。"
                );
            }

            action =
                byId("stock-reason").value;

            const remaining = stockQuantity(
                before.quantity - quantity
            );

            if (remaining <= 0) {

                next.lots.splice(index, 1);

            } else {

                after = {
                    ...before,
                    quantity: remaining
                };

                next.lots[index] = after;
            }


        // =================================
        // 新規登録・編集
        // =================================

        } else {

            const expiryMode =
                byId("stock-expiry-mode").value;

            const expiry =
                byId("stock-expiry").value;

            if (expiryMode === "date" && !expiry) {

                throw new Error(
                    "期限を入力してください。"
                );
            }

            after = {

                id: before?.id || stockNewId(),

                itemId,

                name:

                    byId("stock-name").value.trim()

                    || item.name,

                quantity,

                purchased:
                    byId("stock-purchased").value,

                expiry:
                    expiryMode === "date"
                        ? expiry
                        : "",

                expiryMode,

                location:
                    byId("stock-location").value.trim(),

                createdAt:

                    before?.createdAt

                    || new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()
            };

            if (state.mode === "edit") {

                if (index < 0) {

                    throw new Error(
                        "編集対象が見つかりません。"
                    );
                }

                next.lots[index] = after;

            } else {

                next.lots.push(after);
            }
        }


        // =================================
        // 履歴を保存
        // =================================

        next.history.push({

            id: stockNewId(),

            itemId,

            action,

            before,

            after,

            quantityChange: stockQuantity(

                (after?.quantity || 0)

                - (before?.quantity || 0)
            ),

            timestamp:
                new Date().toISOString()
        });

        if (!stockIsManaged(itemId)) {

            next.managedIds.push(itemId);
        }

        stockSave(next);

        stockExpanded.add(itemId);

        byId("stock-dialog").close();

        stockRender();

    } catch (error) {

        setText(
            "stock-dialog-error",
            error.message
        );
    }
}


// ========================================
// 自宅備蓄管理画面の初期化
// ========================================

async function initStock() {

    try {

        const result = await fetchCalculation(
            "home",
            "category"
        );

        stockItems = result.items.filter(
            item => item.home_required > 0
        );

        // 既存の所有数量を初回のみ引き継ぐ

        stockMigrate(stockItems);

        const categories = [

            ...new Set(

                stockItems.map(
                    item => item.category
                )
            )
        ];

        const categorySelect =
            byId("stock-category");

        categories.forEach(category => {

            const option = createElement(
                "option",
                "",
                category
            );

            option.value = category;

            categorySelect.appendChild(option);
        });


        // =================================
        // 初期状態は登録済みの先頭2用品を展開
        // =================================

        stockItems

            .filter(
                item => stockGetLots(item.id).length > 0
            )

            .slice(0, 2)

            .forEach(
                item => stockExpanded.add(
                    String(item.id)
                )
            );


        // =================================
        // フィルター
        // =================================

        byId("stock-category").addEventListener(
            "change",
            stockRender
        );

        byId("stock-filter").addEventListener(

            "change",

            () => {

                stockExpandFilteredItems();

                stockRender();
            }
        );


        // =================================
        // 上部集計クリック
        // =================================

        document.querySelectorAll(
            "[data-stock-filter]"
        ).forEach(button => {

            button.addEventListener(

                "click",

                () => stockSelectMetric(
                    button.dataset.stockFilter
                )
            );
        });


        // =================================
        // 登録ダイアログ
        // =================================

        byId("stock-add").addEventListener(

            "click",

            () => stockOpenDialog("add")
        );

        byId("stock-item").addEventListener(
            "change",
            stockUpdateUnit
        );

        byId("stock-expiry-mode").addEventListener(
            "change",
            stockUpdateExpiryField
        );

        byId("stock-form").addEventListener(
            "submit",
            stockSubmit
        );

        byId("stock-cancel").addEventListener(

            "click",

            () => byId("stock-dialog").close()
        );


        // =================================
        // URLパラメータ
        // =================================

        const params = new URLSearchParams(
            location.search
        );

        const target = params.get("item");

        const initialFilter = params.get("filter");

        const allowedFilters = [
            "all",
            "short",
            "expired",
            "soon",
            "unknown"
        ];

        if (
            initialFilter &&
            allowedFilters.includes(initialFilter)
        ) {

            byId("stock-filter").value =
                initialFilter;

            stockExpandFilteredItems();
        }

        if (target) {

            stockExpanded.add(target);
        }

        stockRender();

        if (target) {

            byId(`stock-card-${target}`)
                ?.scrollIntoView({
                    block: "center"
                });
        }

    } catch (error) {

        setText(
            "stock-error",
            error.message
        );

        byId("stock-items").replaceChildren();
    }
}


// ========================================
// ページ初期化
// ========================================

document.addEventListener(

    "DOMContentLoaded",

    () => {

        stockSyncOwned();

        const page = document.querySelector(
            ".main-content"
        )?.dataset.page;

        if (page === "stock") {

            initStock();
        }
    }
);