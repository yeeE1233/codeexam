// 檔案名稱: dual_hand_molecule_builder_chinese.js

let video; // 視訊變數
let handPose; // handPose 模型變數
let hands = []; // 用於儲存偵測到的手部數據的陣列

// 類原子物件
let draggables = []; // 可拖動物件陣列
const draggableRadius = 25; // 可拖動物件的半徑
const pinchThreshold = 40; // 食指和拇指之間被視為捏合的距離閾值

// 手部顏色 (最多2隻手)
const handColors = [
    [255, 0, 0, 150], // 紅色代表 hands[0]
    [0, 0, 255, 150]  // 藍色代表 hands[1]
];


function preload() {
    // 確保 ml5.js 和 p5.js 已在您的 HTML 檔案中載入
    // 在此範例中，我們假設 handPose 模型可用
    // 在實際情況中，您會使用：
    // handPose = ml5.handPose({ flipHorizontal: true, maxContinuousChecks: 2 }); // 最多偵測2隻手
    // 為了穩定性和簡便性，通常在 setup 中直接對 video 物件運行 handpose。
}

function setup() {
    createCanvas(640, 480); // 創建畫布
    video = createCapture(VIDEO, { flipped: true }); // 創建視訊捕獲，水平翻轉以實現直觀控制
    video.size(width, height); // 設定視訊大小
    video.hide(); // 隱藏原始視訊元素

    // 初始化 handPose
    // createCapture 中的 `flipped: true` 意味著 ml5.handPose 也應該知道。
    // 某些 ml5 版本會根據視訊內部處理翻轉，其他版本則需要明確設定 flipHorizontal。
    // 我們假設 ml5 已正確處理或視訊翻轉已足夠。
    handPose = ml5.handPose(video, { flipHorizontal: false }, modelReady); // flipHorizontal 設為 false，因為視訊已經翻轉
    handPose.on('predict', gotHands); // 設定預測事件的回調函數

    // 創建一些可拖動的「原子」佔位符
    draggables.push({ x: 100, y: 100, color: color(255, 255, 0), draggedByHand: -1, label: 'A' }); // 黃色原子 A
    draggables.push({ x: 200, y: 100, color: color(0, 255, 255), draggedByHand: -1, label: 'B' }); // 青色原子 B
    draggables.push({ x: 150, y: 200, color: color(255, 0, 255), draggedByHand: -1, label: 'C' }); // 洋紅色原子 C
    draggables.push({ x: 250, y: 200, color: color(128, 128, 0), draggedByHand: -1, label: 'D' }); // 橄欖色原子 D
}

function modelReady() {
    console.log('HandPose 模型準備就緒！');
}

function gotHands(results) {
    hands = results; // 更新偵測到的手部數據
}

function draw() {
    image(video, 0, 0, width, height); // 顯示視訊畫面

    // 處理每隻偵測到的手
    for (let i = 0; i < hands.length; i++) {
        if (i >= 2) break; // 為清晰起見，限制為兩隻手
        const hand = hands[i];
        if (hand.landmarks) { // hand.landmarks 用於較舊的 ml5，hand.keypoints 用於較新的 ml5
            const keypoints = hand.landmarks || hand.keypoints; // 根據您的 ml5 版本進行調整
            const indexTip = keypoints[8]; // 食指指尖
            const thumbTip = keypoints[4]; // 拇指指尖

            // 繪製手部指示器
            const handColor = handColors[i % handColors.length];
            fill(handColor);
            noStroke();
            ellipse(indexTip[0], indexTip[1], 20); // indexTip.x, indexTip.y 用於較新的 ml5
            ellipse(thumbTip[0], thumbTip[1], 20); // thumbTip.x, thumbTip.y 用於較新的 ml5

            // 計算食指和拇指之間的距離
            const distance = dist(indexTip[0], indexTip[1], thumbTip[0], thumbTip[1]);
            let isPinching = distance < pinchThreshold; // 判斷是否捏合

            if (isPinching) {
                // 強調捏合狀態
                fill(handColor[0], handColor[1], handColor[2], 255); // 更亮的顏色
                ellipse((indexTip[0] + thumbTip[0]) / 2, (indexTip[1] + thumbTip[1]) / 2, 30); // 在指尖中間畫圓

                // 檢查是否抓取可拖動物件
                for (let j = 0; j < draggables.length; j++) {
                    let draggable = draggables[j];
                    // 如果這隻手正在捏合且食指位於可拖動物件上 並且 (該物件未被拖動 或 被這隻手拖動)
                    if (dist(indexTip[0], indexTip[1], draggable.x, draggable.y) < draggableRadius) {
                         if (draggable.draggedByHand === -1 || draggable.draggedByHand === i) {
                            draggable.draggedByHand = i; // 將這隻手指定給可拖動物件
                            draggable.x = indexTip[0];   // 更新物件位置到食指尖
                            draggable.y = indexTip[1];
                            break; // 這隻手已經抓取了某物，無需再為這隻手檢查其他可拖動物件
                         }
                    }
                }
            } else {
                // 如果手沒有捏合，釋放它可能正在拖動的任何可拖動物件
                for (let j = 0; j < draggables.length; j++) {
                    if (draggables[j].draggedByHand === i) {
                        draggables[j].draggedByHand = -1; // 設為未被拖動
                    }
                }
            }
        }
    }

    // 繪製可拖動物件
    for (let draggable of draggables) {
        if (draggable.draggedByHand !== -1) { // 如果物件正在被某隻手拖動
            stroke(handColors[draggable.draggedByHand % handColors.length]); // 使用拖動它的手的顏色作為邊框
            strokeWeight(4);
        } else {
            noStroke(); // 否則沒有邊框
        }
        fill(draggable.color); // 填充物件顏色
        ellipse(draggable.x, draggable.y, draggableRadius * 2); // 繪製圓形
        fill(0); // 文字顏色設為黑色
        noStroke();
        textAlign(CENTER, CENTER); // 文字居中對齊
        textSize(draggableRadius); // 設定文字大小
        text(draggable.label, draggable.x, draggable.y); // 顯示標籤
    }
}
