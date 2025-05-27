// 檔案名稱: dual_hand_molecule_builder_revised.js

let video; // 視訊變數
let handPose; // handPose 模型變數
let hands = []; // 用於儲存偵測到的手部數據的陣列
let modelIsReady = false; // 標記模型是否已載入

// 類原子物件
let draggables = []; // 可拖動物件陣列
const draggableRadius = 25; // 可拖動物件的半徑
const pinchThreshold = 40; // 食指和拇指之間被視為捏合的距離閾值

// 手部顏色 (最多2隻手)
const handColors = [
    [255, 0, 0, 150], // 紅色代表 hands[0]
    [0, 0, 255, 150]  // 藍色代表 hands[1]
];

function setup() {
    createCanvas(640, 480);
    console.log("畫布已創建 (Canvas created)");

    // 1. 創建視訊捕獲 (不進行預先翻轉)
    video = createCapture(VIDEO, function(stream) {
        // 這個回呼在視訊流實際開始時觸發
        console.log("攝影機影像流已準備好 (Video stream ready - createCapture callback)");
        console.log("  - video.width (p5):", video.width, "video.height (p5):", video.height);
        if (video.elt) {
            console.log("  - video.elt.videoWidth (HTML):", video.elt.videoWidth, "video.elt.videoHeight (HTML):", video.elt.videoHeight);
        }
    });
    video.size(width, height); // 設定 p5.MediaElement 的尺寸
    video.hide(); // 隱藏原始 HTML video 元素
    console.log("攝影機設定完成 (Video capture setup complete)");

    // 2. 初始化 handPose，讓 ml5.js 處理水平翻轉
    console.log("嘗試載入 HandPose 模型... (Attempting to load HandPose model...)");
    handPose = ml5.handPose(video, { flipHorizontal: true }, function() {
        // modelReady 回呼函數
        modelIsReady = true;
        console.log('HandPose 模型準備就緒！ (HandPose Model Ready!)');
    });

    // 3. 設定 'predict' 事件的監聽器
    handPose.on('predict', function(results) {
        hands = results;
        // if (hands.length > 0) {
        //     console.log("偵測到手部: ", hands.length);
        // }
    });

    // 創建一些可拖動的「原子」佔位符
    draggables.push({ x: 100, y: 100, color: color(255, 255, 0), draggedByHand: -1, label: 'A' });
    draggables.push({ x: 200, y: 100, color: color(0, 255, 255), draggedByHand: -1, label: 'B' });
    draggables.push({ x: 150, y: 200, color: color(255, 0, 255), draggedByHand: -1, label: 'C' });
    draggables.push({ x: 250, y: 200, color: color(128, 128, 0), draggedByHand: -1, label: 'D' });
    console.log("可拖動物件已創建 (Draggable objects created)");
}

function draw() {
    // 檢查 video 物件和其底層 HTML 元素是否準備好
    if (video && video.elt && video.elt.readyState >= 2 && video.width > 0 && video.height > 0) {
        // video.elt.readyState >= 2 (HAVE_CURRENT_DATA) 表示當前影格數據至少可用
        // video.width > 0 (p5.MediaElement) 也表明 p5 這邊認為視訊是有效的
        image(video, 0, 0, width, height); // 繪製視訊畫面
    } else {
        background(30, 30, 70); // 深色背景表示等待
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        if (!video || !video.elt) {
            text("攝影機物件尚未初始化...", width / 2, height / 2 - 20);
            text("(Video object not initialized...)", width / 2, height / 2 + 10);
        } else {
            text(`等待攝影機畫面載入...
                   (Waiting for video feed...)
                   HTML ReadyState: ${video.elt.readyState}
                   p5 video width: ${video.width}`, width / 2, height / 2);
        }
        return; // 如果視訊未完全準備好，暫不執行後續的繪圖和偵測
    }

    // 只有在模型準備好之後才執行手部偵測相關的繪圖
    if (!modelIsReady) {
        fill(255, 255, 0);
        textAlign(LEFT, TOP);
        text("HandPose 模型載入中...", 10, 10);
        // 在模型載入完成前，先不執行手部繪製和拖動物件的邏輯
        // 但我們仍然會繪製 draggables 的初始狀態
    }

    // 繪製可拖動物件 (即使模型未載入，也顯示它們的初始位置)
    for (let draggable of draggables) {
        if (draggable.draggedByHand !== -1 && modelIsReady) { // 只有模型準備好才響應拖動
            stroke(handColors[draggable.draggedByHand % handColors.length]);
            strokeWeight(4);
        } else {
            noStroke();
        }
        fill(draggable.color);
        ellipse(draggable.x, draggable.y, draggableRadius * 2);
        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(draggableRadius);
        text(draggable.label, draggable.x, draggable.y);
    }


    // 如果模型已載入，處理和繪製手部
    if (modelIsReady) {
        for (let i = 0; i < hands.length; i++) {
            if (i >= 2) break;
            const hand = hands[i];

            // 使用 'annotations' 來獲取關鍵點，這是 ml5.js 0.12.2 handpose 推薦的方式
            // 'annotations' 包含如 'thumb', 'indexFinger' 等部位，每個部位是一個關鍵點陣列
            // 每個關鍵點是 [x, y, z]
            if (hand.annotations && hand.annotations.indexFinger && hand.annotations.thumb) {
                const indexFingerPoints = hand.annotations.indexFinger;
                const thumbPoints = hand.annotations.thumb;

                // 指尖通常是每個手指部位陣列的最後一個點 (索引 3)
                const indexTipArray = indexFingerPoints[3]; // [x,y,z]
                const thumbTipArray = thumbPoints[3];       // [x,y,z]

                if (!indexTipArray || !thumbTipArray) continue;

                const indexTip = { x: indexTipArray[0], y: indexTipArray[1] };
                const thumbTip = { x: thumbTipArray[0], y: thumbTipArray[1] };

                const handColor = handColors[i % handColors.length];
                fill(handColor);
                noStroke();
                ellipse(indexTip.x, indexTip.y, 20);
                ellipse(thumbTip.x, thumbTip.y, 20);

                const distance = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
                let isPinching = distance < pinchThreshold;

                if (isPinching) {
                    fill(handColor[0], handColor[1], handColor[2], 255);
                    ellipse((indexTip.x + thumbTip.x) / 2, (indexTip.y + thumbTip.y) / 2, 30);

                    for (let j = 0; j < draggables.length; j++) {
                        let draggable = draggables[j];
                        if (dist(indexTip.x, indexTip.y, draggable.x, draggable.y) < draggableRadius) {
                             if (draggable.draggedByHand === -1 || draggable.draggedByHand === i) {
                                draggable.draggedByHand = i;
                                draggable.x = indexTip.x;
                                draggable.y = indexTip.y;
                                break;
                             }
                        }
                    }
                } else {
                    for (let j = 0; j < draggables.length; j++) {
                        if (draggables[j].draggedByHand === i) {
                            draggables[j].draggedByHand = -1;
                        }
                    }
                }
            }
        }
    } // end if (modelIsReady)
}
