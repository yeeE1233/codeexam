// 檔案名稱: dual_hand_molecule_builder_chinese_fixed.js

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
    // preload 通常用於載入外部資源，如圖片、聲音、模型檔案
    // ml5.handPose 模型載入通常是非同步的，放在 setup 中配合 callback (modelReady) 也是常見做法
}

function setup() {
    createCanvas(640, 480); // 創建畫布
    console.log("畫布已創建");

    video = createCapture(VIDEO, function() {
        console.log("攝影機影像開始擷取 (createCapture callback)");
        // 這個回呼函數在 p5.js 的 createCapture 中不是必需的，
        // 但如果它被觸發，表示影像擷取至少有嘗試開始。
    });
    video.size(width, height); // 設定視訊大小
    video.hide(); // 隱藏原始視訊元素
    console.log("攝影機設定完成，嘗試載入 HandPose 模型...");

    // 初始化 handPose
    // createCapture 中的 `flipped: true` (如果這樣設定，雖然您的範例是 { flipped: true } 在 video = createCapture 裡面)
    // 和 handPose 中的 flipHorizontal 設定需要協調以達到鏡像效果。
    // 如果 video 已經是 flipped: true, handPose 的 flipHorizontal: false 通常是正確的，
    // 這樣 handPose 處理的是已經鏡像的座標。
    handPose = ml5.handPose(video, { flipHorizontal: false }, modelReady);
    handPose.on('predict', gotHands); // 設定預測事件的回調函數

    // 創建一些可拖動的「原子」佔位符
    draggables.push({ x: 100, y: 100, color: color(255, 255, 0), draggedByHand: -1, label: 'A' });
    draggables.push({ x: 200, y: 100, color: color(0, 255, 255), draggedByHand: -1, label: 'B' });
    draggables.push({ x: 150, y: 200, color: color(255, 0, 255), draggedByHand: -1, label: 'C' });
    draggables.push({ x: 250, y: 200, color: color(128, 128, 0), draggedByHand: -1, label: 'D' });
    console.log("可拖動物件已創建");
}

function modelReady() {
    console.log('HandPose 模型準備就緒！');
    // 有時第一次 modelReady 後，handpose 會再重新載入一次或做其他初始化
    // 可以嘗試在這裡第一次呼叫 predict，雖然 'predict' 事件應該會自動開始
    // handPose.predict(video); // 根據 ml5 版本，可能不需要手動呼叫
}

function gotHands(results) {
    hands = results; // 更新偵測到的手部數據
    if (hands.length > 0) {
        // console.log("偵測到手部數量: ", hands.length); // 可取消註解以查看手部數量
    }
}

function draw() {
    image(video, 0, 0, width, height); // 顯示視訊畫面

    // 處理每隻偵測到的手
    for (let i = 0; i < hands.length; i++) {
        if (i >= 2) break; // 為清晰起見，限制為兩隻手
        const hand = hands[i];

        // 檢查 hand.landmarks 或 hand.keypoints 是否存在且有內容
        // ml5.js 版本不同，屬性名稱可能為 landmarks (通常是 2D 陣列) 或 keypoints (通常是物件陣列)
        const currentKeypoints = hand.annotations || hand.keypoints || hand.landmarks; // hand.annotations 是較新的稱呼，包含各部位

        if (currentKeypoints) {
            // 根據 ml5.js 版本和 handpose 模型，關鍵點的結構可能不同。
            // 現代版本通常 `keypoints` 是物件陣列，每個物件有 x, y, z, name。
            // 食指指尖通常是第 8 個關鍵點，拇指指尖是第 4 個。
            // 我們需要找到正確的方式來獲取這些點。
            // `hand.annotations` 結構: hand.annotations.thumb[3], hand.annotations.indexFinger[3] (3 是指尖)

            let indexTip, thumbTip;

            if (hand.annotations) { // 優先使用 annotations (較新 ml5 版本)
                indexTip = hand.annotations.indexFinger[3]; // [x,y,z]
                thumbTip = hand.annotations.thumb[3];       // [x,y,z]
                 // 轉換為物件形式以統一後續處理 (如果 annotations 直接給陣列)
                if (Array.isArray(indexTip)) indexTip = { x: indexTip[0], y: indexTip[1], z: indexTip[2] };
                if (Array.isArray(thumbTip)) thumbTip = { x: thumbTip[0], y: thumbTip[1], z: thumbTip[2] };

            } else if (hand.keypoints) { // 次之使用 keypoints (通常是物件陣列)
                indexTip = hand.keypoints[8]; // {x, y, (z), name}
                thumbTip = hand.keypoints[4]; // {x, y, (z), name}
            } else if (hand.landmarks) { // 最後嘗試 landmarks (可能是 [x,y,z] 陣列)
                indexTip = { x: hand.landmarks[8][0], y: hand.landmarks[8][1] };
                thumbTip = { x: hand.landmarks[4][0], y: hand.landmarks[4][1] };
            } else {
                // console.warn("無法獲取手部關鍵點的已知結構");
                continue; // 如果沒有可用的關鍵點數據，跳過這隻手
            }

            // 確保 indexTip 和 thumbTip 已被正確賦值且是物件
            if (!indexTip || !thumbTip || typeof indexTip.x === 'undefined' || typeof thumbTip.x === 'undefined') {
                // console.warn("indexTip 或 thumbTip 數據不完整或格式不對", indexTip, thumbTip);
                continue;
            }

            // console.log(`Hand ${i} Index: (${indexTip.x.toFixed(2)}, ${indexTip.y.toFixed(2)}), Thumb: (${thumbTip.x.toFixed(2)}, ${thumbTip.y.toFixed(2)})`);


            // 繪製手部指示器
            const handColor = handColors[i % handColors.length];
            fill(handColor);
            noStroke();
            ellipse(indexTip.x, indexTip.y, 20);
            ellipse(thumbTip.x, thumbTip.y, 20);

            // 計算食指和拇指之間的距離
            const distance = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
            let isPinching = distance < pinchThreshold; // 判斷是否捏合

            if (isPinching) {
                // 強調捏合狀態
                fill(handColor[0], handColor[1], handColor[2], 255); // 更亮的顏色
                ellipse((indexTip.x + thumbTip.x) / 2, (indexTip.y + thumbTip.y) / 2, 30); // 在指尖中間畫圓

                // 檢查是否抓取可拖動物件
                for (let j = 0; j < draggables.length; j++) {
                    let draggable = draggables[j];
                    if (dist(indexTip.x, indexTip.y, draggable.x, draggable.y) < draggableRadius) {
                         if (draggable.draggedByHand === -1 || draggable.draggedByHand === i) {
                            draggable.draggedByHand = i; // 將這隻手指定給可拖動物件
                            draggable.x = indexTip.x;   // 更新物件位置到食指尖
                            draggable.y = indexTip.y;
                            break;
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
        if (draggable.draggedByHand !== -1) {
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
}
