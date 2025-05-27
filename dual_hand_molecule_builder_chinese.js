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

    // 1. 創建視訊捕獲
    video = createCapture(VIDEO, function(stream) {
        console.log("攝影機影像流已準備好");
    });
    video.size(width, height);
    video.hide();

    // 2. 初始化 handPose
    console.log("嘗試載入 HandPose 模型...");
    console.log("ml5 version:", ml5.version); // 確認 ml5 是否正確載入
    console.log("ml5.handPose:", typeof ml5.handPose); // 確認 handPose 是否存在

    handPose = ml5.handPose(video, { flipHorizontal: true }, function() {
        modelIsReady = true;
        console.log('HandPose 模型準備就緒！');
    });

    handPose.on('predict', function(results) {
        hands = results;
    });

    // 創建可拖動物件
    draggables.push({ x: 100, y: 100, color: color(255, 255, 0), draggedByHand: -1, label: 'A' });
    draggables.push({ x: 200, y: 100, color: color(0, 255, 255), draggedByHand: -1, label: 'B' });
    draggables.push({ x: 150, y: 200, color: color(255, 0, 255), draggedByHand: -1, label: 'C' });
    draggables.push({ x: 250, y: 200, color: color(128, 128, 0), draggedByHand: -1, label: 'D' });
    console.log("可拖動物件已創建");
}

function draw() {
    console.log("進入 draw 函數");

    if (video && video.elt && video.elt.readyState >= 2 && video.width > 0 && video.height > 0) {
        image(video, 0, 0, width, height);
    } else {
        console.log("Video not ready. ReadyState:", video?.elt?.readyState);
        background(30, 30, 70);
        return;
    }

    if (!modelIsReady) {
        console.log("HandPose 模型尚未載入");
        return;
    }

    for (let draggable of draggables) {
        console.log("繪製 draggable:", draggable);
        fill(draggable.color);
        ellipse(draggable.x, draggable.y, draggableRadius * 2);
    }


    // 如果模型已載入，處理和繪製手部
    if (modelIsReady) {
        if (!video || !video.elt || video.elt.readyState < 2) {
            console.error("Video 未準備好，ReadyState:", video?.elt?.readyState);
            return;
        }

        if (!modelIsReady) {
            console.error("HandPose 模型尚未載入");
            return;
        }

        if (hands.length === 0) {
            console.warn("未偵測到任何手部");
        }

        for (let i = 0; i < hands.length; i++) {
            const hand = hands[i];
            if (!hand.annotations || !hand.annotations.indexFinger || !hand.annotations.thumb) {
                console.warn("手部資料不完整，無法處理:", hand);
                continue;
            }

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
