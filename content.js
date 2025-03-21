/**
 * 我来直聘 - BOSS直聘自动打招呼插件
 * @author 叶俊宇 <ye1026789747@Gmail.com>
 * @copyright 2024 叶俊宇
 * @license MIT
 */

// 全局变量
let greetCount = 0;
let MAX_GREETS = 100; // 默认值
let isRunning = false;
let visitedJobCards = new Set(); // 存储已访问的职位ID
let currentJobId = null; // 当前正在处理的职位ID

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 随机延迟，避免被检测
const randomDelay = async () => {
    const time = Math.random() * 1000 + 500; // 500-1500毫秒随机延迟
    await delay(time);
};

// 保存当前进度到存储
function saveProgress() {
    chrome.storage.local.set({
        greetCount: greetCount,
        isRunning: isRunning,
        visitedJobCards: Array.from(visitedJobCards),
        lastUpdateTime: new Date().getTime()
    }, () => {
        console.log('进度已保存，已完成:', greetCount);
    });
}

// 从存储加载进度
async function loadProgress() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['greetCount', 'isRunning', 'visitedJobCards', 'lastUpdateTime', 'maxGreets'], (result) => {
            if (result.maxGreets) {
                MAX_GREETS = result.maxGreets;
            }
            if (result.greetCount !== undefined) {
                greetCount = result.greetCount;
                isRunning = result.isRunning || false;
                visitedJobCards = new Set(result.visitedJobCards || []);
                
                console.log('已加载进度:', greetCount, '运行状态:', isRunning);
                resolve(true);
            } else {
                console.log('没有找到保存的进度');
                resolve(false);
            }
        });
    });
}

// 滚动到元素位置
async function scrollToElement(element) {
    if (!element) return;
    
    try {
        const rect = element.getBoundingClientRect();
        const scrollY = rect.top + window.scrollY - 200; // 向上偏移200px，使元素在视窗中间偏上位置
        window.scrollTo({ top: scrollY, behavior: 'smooth' });
        await delay(500); // 等待滚动完成，减少了延迟时间
    } catch (error) {
        console.error('滚动到元素位置时出错:', error);
    }
}

// 提取职位ID
function extractJobId(element) {
    try {
        // 尝试从卡片元素中提取职位ID
        const jobLink = element.querySelector('a.job-name');
        if (jobLink) {
            const href = jobLink.getAttribute('href');
            const match = href.match(/\/job_detail\/([^.]+)\.html/);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // 如果上面的方法失败，尝试从元素的数据属性或其他特征提取
        const uniqueId = element.getAttribute('data-id') || 
                          element.getAttribute('data-jobid') ||
                          element.getAttribute('data-ka') || 
                          Math.random().toString(36).substring(2, 15);
        
        return uniqueId;
    } catch (error) {
        console.error('提取职位ID时出错:', error);
        return 'unknown-' + Math.random().toString(36).substring(2, 15);
    }
}

// 直接点击职位标题链接而不是整个卡片
async function clickJobTitle(card) {
    try {
        const jobTitleLink = card.querySelector('a.job-name');
        if (jobTitleLink) {
            console.log('找到并点击职位标题链接:', jobTitleLink.textContent);
            // 使用原生JS点击事件
            jobTitleLink.click();
            await delay(1500);
            return true;
        } else {
            console.log('没有找到职位标题链接');
            return false;
        }
    } catch (error) {
        console.error('点击职位标题时出错:', error);
        return false;
    }
}

// 模拟真实点击
function simulateRealClick(element) {
    if (!element) return false;
    
    try {
        // 创建鼠标事件
        const mouseDown = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        const mouseUp = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        const click = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        // 发送事件
        element.dispatchEvent(mouseDown);
        element.dispatchEvent(mouseUp);
        element.dispatchEvent(click);
        
        return true;
    } catch (error) {
        console.error('模拟点击时出错:', error);
        return false;
    }
}

// 点击职位卡片
async function clickJobCard() {
    try {
        // 获取所有职位卡片
        const jobCards = document.querySelectorAll('.job-card-wrap');
        console.log(`找到 ${jobCards.length} 个职位卡片`);
        
        if (!jobCards || jobCards.length === 0) {
            console.log('没有找到任何职位卡片');
            return false;
        }
        
        // 查找第一个未访问的职位卡片
        for (let i = 0; i < jobCards.length; i++) {
            const card = jobCards[i];
            const jobId = extractJobId(card);
            
            if (!visitedJobCards.has(jobId)) {
                console.log(`找到未访问的职位卡片 #${i+1}, ID: ${jobId}`);
                
                // 滚动到该元素
                await scrollToElement(card);
                await delay(300); // 减少延迟时间
                
                // 标记为已访问
                visitedJobCards.add(jobId);
                currentJobId = jobId;
                saveProgress(); // 保存进度
                
                // 尝试点击职位名称链接
                const jobLink = card.querySelector('a.job-name');
                if (jobLink) {
                    console.log('点击职位名称链接:', jobLink.textContent);
                    jobLink.click();
                    simulateRealClick(jobLink);
                    
                    // 等待加载详情页
                    await delay(1200); // 减少延迟时间
                    
                    // 检查是否已经切换到详情页
                    const detailContainer = document.querySelector('.job-detail-container');
                    if (detailContainer) {
                        console.log('通过点击职位名称成功加载详情页');
                        return true;
                    }
                }
                
                // 如果点击职位名称链接失败，尝试点击整个卡片
                console.log('点击整个职位卡片');
                card.click();
                simulateRealClick(card);
                
                // 等待加载详情页
                await delay(1200); // 减少延迟时间
                
                // 检查是否已经切换到详情页
                const detailContainer = document.querySelector('.job-detail-container');
                if (detailContainer) {
                    console.log('通过点击整个卡片成功加载详情页');
                    return true;
                } else {
                    console.log('无法加载职位详情页，尝试下一个职位');
                }
            } else {
                console.log(`职位 #${i+1}, ID: ${jobId} 已被访问过，跳过`);
            }
        }
        
        // 如果所有职位卡片都已访问过，重置访问状态并尝试寻找新的职位卡片
        console.log('当前页面所有职位卡片都已访问，尝试重新开始或翻页');
        
        // 如果已经尝试了多次，则提示需要翻页
        if (visitedJobCards.size >= jobCards.length) {
            console.log('所有职位都已尝试过，建议翻页');
            
            // 尝试自动翻页
            const nextPageButton = document.querySelector('.page-next, .next, .pagination-next');
            if (nextPageButton && !nextPageButton.classList.contains('disabled')) {
                console.log('自动点击下一页按钮');
                nextPageButton.click();
                simulateRealClick(nextPageButton);
                await delay(2000); // 等待页面加载
                
                // 重置已访问集合
                visitedJobCards = new Set();
                saveProgress(); // 保存进度
                return await clickJobCard(); // 递归调用，在新页面上查找职位
            }
            
            return false;
        }
        
        return false;
    } catch (error) {
        console.error('点击职位卡片时出错:', error);
        return false;
    }
}

// 检查按钮文本是否为"立即沟通"
function isChatButton(button) {
    if (!button) return false;
    
    // 检查按钮文本
    const buttonText = button.textContent.trim();
    console.log('检查按钮文本:', buttonText);
    return buttonText === '立即沟通';
}

// 点击立即沟通按钮（不点击继续沟通）
async function clickChatButton() {
    try {
        await delay(800); // 减少延迟时间
        
        // 记录当前页面元素，便于调试
        console.log('当前页面上的按钮元素:');
        document.querySelectorAll('.op-btn').forEach((btn, index) => {
            console.log(`按钮 #${index+1}:`, btn.textContent.trim(), btn);
        });
        
        // 使用用户提供的精确选择器
        const specificSelector = '#wrap > div.job-recommend-main > div.job-recommend-result > div > div > div.job-detail-container > div > div.job-detail-header > div.job-detail-op.clearfix > a.op-btn.op-btn-chat';
        const chatButton = document.querySelector(specificSelector);
        
        // 检查specificSelector找到的按钮
        if (chatButton) {
            console.log('通过specificSelector找到按钮:', chatButton.textContent.trim());
            
            // 只点击"立即沟通"按钮，遇到"继续沟通"时跳过
            if (chatButton.textContent.trim() === '立即沟通' && !chatButton.classList.contains('btn-disabled')) {
                console.log('点击立即沟通按钮');
                chatButton.click();
                simulateRealClick(chatButton);
                await randomDelay();
                return true;
            } else {
                console.log('找到的按钮不是立即沟通或已禁用:', chatButton.textContent.trim());
                if (chatButton.textContent.trim() === '继续沟通') {
                    console.log('跳过已沟通过的职位');
                    return false; // 返回false表示需要跳过这个职位
                }
            }
        } else {
            console.log('没有通过specificSelector找到按钮');
        }
        
        // 通用选择器 - 只寻找"立即沟通"按钮
        const allChatButtons = document.querySelectorAll('.op-btn.op-btn-chat');
        console.log(`找到 ${allChatButtons.length} 个聊天按钮`);
        
        // 遍历所有找到的按钮，寻找"立即沟通"按钮
        for (const btn of allChatButtons) {
            console.log('检查按钮:', btn.textContent.trim());
            if (btn.textContent.trim() === '立即沟通' && !btn.classList.contains('btn-disabled')) {
                console.log('点击立即沟通按钮');
                btn.click();
                simulateRealClick(btn);
                await randomDelay();
                return true;
            } else if (btn.textContent.trim() === '继续沟通') {
                console.log('跳过已沟通过的职位');
                return false; // 返回false表示需要跳过这个职位
            }
        }
        
        // 尝试更宽松的选择方式查找立即沟通按钮
        console.log('尝试更宽松的选择方式查找立即沟通按钮');
        const allLinks = document.querySelectorAll('a');
        for (const link of allLinks) {
            if (link.textContent.trim() === '立即沟通') {
                console.log('通过文本内容找到了立即沟通按钮');
                link.click();
                simulateRealClick(link);
                await randomDelay();
                return true;
            }
        }
        
        console.log('未找到立即沟通按钮，跳过该职位');
        return false;
    } catch (error) {
        console.error('点击立即沟通按钮时出错:', error);
        return false;
    }
}

// 点击"留在此页"按钮
async function clickStayButton() {
    try {
        await delay(800); // 减少延迟时间
        
        // 记录当前页面元素，便于调试
        console.log('当前页面上的取消按钮:');
        document.querySelectorAll('.cancel-btn, .default-btn').forEach((btn, index) => {
            console.log(`按钮 #${index+1}:`, btn.textContent.trim(), btn);
        });
        
        // 使用用户提供的精确选择器
        const specificSelector = 'body > div.greet-boss-dialog > div.greet-boss-container > div.greet-boss-footer > a.default-btn.cancel-btn';
        const stayButton = document.querySelector(specificSelector);
        
        // 检查是否找到了精确选择器的按钮
        if (stayButton) {
            console.log('通过精确选择器找到留在此页按钮:', stayButton.textContent.trim());
            stayButton.click();
            simulateRealClick(stayButton);
            await randomDelay();
            return true;
        } else {
            console.log('未通过精确选择器找到留在此页按钮');
        }
        
        // 通用选择器
        const genericStayButton = document.querySelector('.cancel-btn');
        if (genericStayButton) {
            console.log('通过通用选择器找到留在此页按钮:', genericStayButton.textContent.trim());
            genericStayButton.click();
            simulateRealClick(genericStayButton);
            await randomDelay();
            return true;
        } else {
            console.log('未通过通用选择器找到留在此页按钮');
        }
        
        // 尝试查找所有包含"留在此页"或"取消"文本的按钮
        console.log('尝试查找所有包含"留在此页"或"取消"文本的按钮');
        const allButtons = document.querySelectorAll('a, button, .btn, [role="button"]');
        for (const btn of allButtons) {
            const text = btn.textContent.trim();
            if (text.includes('留在此页') || text.includes('取消')) {
                console.log('找到按钮:', text);
                btn.click();
                simulateRealClick(btn);
                await randomDelay();
                return true;
            }
        }
        
        // 检查是否存在对话框元素
        const dialog = document.querySelector('.greet-boss-dialog');
        if (!dialog) {
            console.log('没有找到对话框元素，可能没有弹出对话框');
            return true; // 返回true让流程继续
        }
        
        // 尝试点击对话框中的任何一个按钮
        const dialogButtons = dialog.querySelectorAll('a, button');
        if (dialogButtons.length > 0) {
            console.log('尝试点击对话框中的按钮:', dialogButtons[0].textContent.trim());
            dialogButtons[0].click();
            simulateRealClick(dialogButtons[0]);
            await randomDelay();
            return true;
        }
        
        console.log('没有找到留在此页按钮');
        return false;
    } catch (error) {
        console.error('点击留在此页按钮时出错:', error);
        return false;
    }
}

// 回到职位列表
async function backToJobList() {
    try {
        // 检查是否已经在职位列表页面
        const jobListContainer = document.querySelector('.job-list-container');
        if (jobListContainer) {
            console.log('已经在职位列表页面');
            return true;
        }
        
        // 尝试点击返回按钮
        const backButton = document.querySelector('.job-detail-back');
        if (backButton) {
            console.log('点击返回按钮');
            simulateRealClick(backButton);
            await delay(800); // 减少延迟时间
            return true;
        }
        
        // 尝试点击职位列表标签
        const jobListTab = document.querySelector('.job-tab-item');
        if (jobListTab) {
            console.log('点击职位列表标签');
            simulateRealClick(jobListTab);
            await delay(800); // 减少延迟时间
            return true;
        }
        
        // 尝试直接修改URL返回到职位列表页面
        if (window.location.href.includes('/job_detail/')) {
            console.log('通过URL修改返回职位列表');
            window.history.back();
            await delay(800); // 减少延迟时间
            return true;
        }
        
        console.log('无法返回职位列表，但将继续尝试操作');
        return true; // 返回true让流程继续，因为可能已经在列表页
    } catch (error) {
        console.error('返回职位列表时出错:', error);
        return true; // 返回true让流程继续
    }
}

// 主要自动化流程
async function autoGreet() {
    if (greetCount >= MAX_GREETS) {
        isRunning = false;
        saveProgress(); // 保存进度
        chrome.runtime.sendMessage({type: 'complete'});
        console.log('已完成所有打招呼');
        return;
    }

    if (!isRunning) {
        console.log('自动打招呼已停止');
        saveProgress(); // 保存停止状态
        return;
    }
    
    try {
        console.log('开始第', greetCount + 1, '次打招呼');
        
        // 确保回到职位列表页面
        const isOnListPage = await backToJobList();
        if (!isOnListPage) {
            console.log('无法返回职位列表页面，尝试刷新页面');
            window.location.reload();
            await delay(2000); // 减少延迟时间
        }
        
        // 点击职位卡片
        const cardClicked = await clickJobCard();
        if (!cardClicked) {
            // 如果没有新的职位卡片，可能需要翻页或结束
            console.log('需要翻页或结束');
            chrome.runtime.sendMessage({type: 'needNextPage'});
            
            // 暂停一段时间，等待用户响应
            await delay(3000); // 减少延迟时间
            
            // 尝试自动翻页
            const nextPageButton = document.querySelector('.page-next, .next, .pagination-next');
            if (nextPageButton && !nextPageButton.classList.contains('disabled')) {
                console.log('自动点击下一页按钮');
                nextPageButton.click();
                simulateRealClick(nextPageButton);
                await delay(2000); // 减少延迟时间
                
                // 重置已访问集合，重新开始搜索
                visitedJobCards = new Set();
                saveProgress(); // 保存进度
                // 递归调用自身，继续流程
                autoGreet();
            } else {
                // 提示用户手动翻页
                console.log('请手动翻页后继续');
                await delay(5000); // 减少延迟时间
                autoGreet(); // 递归调用，直到用户翻页或停止脚本
            }
            return;
        }

        await delay(1000); // 减少延迟时间

        // 点击立即沟通按钮
        const chatClicked = await clickChatButton();
        if (!chatClicked) {
            // 如果无法点击立即沟通按钮，跳过当前职位，尝试下一个
            console.log('无法点击立即沟通按钮或遇到继续沟通按钮，跳过当前职位');
            await delay(500); // 减少延迟时间
            autoGreet(); // 递归调用以处理下一个职位
            return;
        }

        await delay(1000); // 减少延迟时间

        // 点击留在此页
        const stayClicked = await clickStayButton();
        if (stayClicked) {
            greetCount++;
            console.log('成功完成第', greetCount, '次打招呼');
            saveProgress(); // 保存进度
            chrome.runtime.sendMessage({
                type: 'progress',
                count: greetCount
            });
        } else {
            console.log('无法点击留在此页按钮，但流程已完成');
            greetCount++;
            saveProgress(); // 保存进度
            chrome.runtime.sendMessage({
                type: 'progress',
                count: greetCount
            });
        }

        // 继续下一个
        await delay(1000); // 减少延迟时间
        autoGreet();

    } catch (error) {
        console.error('自动打招呼出错:', error);
        
        // 保存出错状态
        saveProgress();
        
        // 错误恢复：等待一段时间后重试
        console.log('3秒后尝试恢复...'); // 减少延迟时间
        await delay(3000); // 减少延迟时间
        
        if (isRunning) {
            console.log('尝试从错误中恢复');
            autoGreet();
        } else {
            console.log('由于停止信号，不再尝试恢复');
        }
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request);
    
    if (request.action === 'startAutoGreet') {
        if (!isRunning) {
            console.log('开始自动打招呼');
            isRunning = true;
            greetCount = 0;
            visitedJobCards = new Set();
            currentJobId = null;
            saveProgress();
            autoGreet();
            sendResponse({status: 'started'});
        } else {
            console.log('自动打招呼已经在运行中');
            sendResponse({status: 'already_running', count: greetCount});
        }
    } else if (request.action === 'resumeAutoGreet') {
        console.log('恢复自动打招呼');
        isRunning = true;
        saveProgress();
        autoGreet();
        sendResponse({status: 'resumed'});
    } else if (request.action === 'getProgress') {
        loadProgress().then(() => {
            console.log('返回进度:', greetCount);
            sendResponse({count: greetCount, isRunning: isRunning});
        });
        return true;
    } else if (request.action === 'stop') {
        console.log('停止自动打招呼');
        isRunning = false;
        saveProgress();
        sendResponse({status: 'stopped'});
    } else if (request.action === 'reset') {
        console.log('重置进度');
        greetCount = 0;
        isRunning = false;
        visitedJobCards = new Set();
        currentJobId = null;
        saveProgress();
        sendResponse({status: 'reset'});
    } else if (request.action === 'updateMaxGreets') {
        console.log('更新最大打招呼次数:', request.maxGreets);
        MAX_GREETS = request.maxGreets;
        chrome.storage.local.set({ maxGreets: MAX_GREETS });
        sendResponse({status: 'updated'});
    }
    return true;
}); 