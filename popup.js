/**
 * 我来直聘 - 弹窗界面交互
 * @author 叶俊宇 <ye1026789747@Gmail.com>
 * @copyright 2024 叶俊宇
 * @license MIT
 */

document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('startBtn');
  const stopButton = document.getElementById('stopBtn');
  const resetButton = document.getElementById('resetBtn');
  const progressBar = document.querySelector('.progress');
  const progressBarInner = document.querySelector('.progress-bar-inner');
  const progressCount = document.getElementById('progressCount');
  const maxGreetsInput = document.getElementById('maxGreets');
  const maxGreetsDisplay = document.getElementById('maxGreetsDisplay');
  const saveSettingsBtn = document.getElementById('saveSettings');

  // 显示状态提示
  function showStatus(message, isError = false) {
    const statusDiv = document.createElement('div');
    statusDiv.textContent = message;
    statusDiv.style.padding = '10px';
    statusDiv.style.marginTop = '10px';
    statusDiv.style.borderRadius = '4px';
    statusDiv.style.backgroundColor = isError ? '#ffecec' : '#e8f5e9';
    statusDiv.style.color = isError ? '#f44336' : '#4caf50';
    statusDiv.style.fontSize = '14px';
    
    // 移除之前的状态信息
    const oldStatus = document.querySelector('.status-message');
    if (oldStatus) {
      oldStatus.remove();
    }
    
    statusDiv.classList.add('status-message');
    document.body.appendChild(statusDiv);
    
    // 5秒后自动消失（如果不是错误）
    if (!isError) {
      setTimeout(() => {
        statusDiv.remove();
      }, 5000);
    }
  }

  // 加载设置
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['maxGreets', 'lastResetDate']);
      const maxGreets = result.maxGreets || 100;
      maxGreetsInput.value = maxGreets;
      maxGreetsDisplay.textContent = maxGreets;
      
      // 检查是否需要每日重置
      const today = new Date().toDateString();
      if (result.lastResetDate !== today) {
        const shouldReset = confirm('检测到这是今天第一次打开插件，是否要重置进度？');
        if (shouldReset) {
          resetProgress();
        } else {
          // 即使用户选择不重置，也更新日期以避免重复提醒
          chrome.storage.local.set({ lastResetDate: today });
        }
      }
    } catch (error) {
      console.error('加载设置时出错:', error);
    }
  }

  // 保存设置
  saveSettingsBtn.addEventListener('click', async function() {
    const maxGreets = parseInt(maxGreetsInput.value);
    if (maxGreets < 1 || maxGreets > 200) {
      showStatus('请输入1-200之间的数字', true);
      return;
    }
    
    try {
      await chrome.storage.local.set({ maxGreets });
      maxGreetsDisplay.textContent = maxGreets;
      showStatus('设置已保存');
      
      // 通知content script更新最大值
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateMaxGreets',
          maxGreets: maxGreets
        });
      }
    } catch (error) {
      console.error('保存设置时出错:', error);
      showStatus('保存设置失败', true);
    }
  });

  // 重置进度
  async function resetProgress() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!tab) {
        showStatus('无法获取当前标签页信息', true);
        return;
      }
      
      // 更新存储的进度
      await chrome.storage.local.set({
        greetCount: 0,
        isRunning: false,
        visitedJobCards: [],
        lastResetDate: new Date().toDateString()
      });
      
      // 更新UI
      updateProgress(0);
      startButton.textContent = '开始自动打招呼';
      startButton.dataset.action = 'start';
      startButton.style.display = 'block';
      stopButton.style.display = 'none';
      
      // 通知content script
      chrome.tabs.sendMessage(tab.id, { action: 'reset' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送重置消息时出错:', chrome.runtime.lastError);
          return;
        }
        if (response && response.status === 'reset') {
          showStatus('进度已重置');
        }
      });
    } catch (error) {
      console.error('重置进度时出错:', error);
      showStatus('重置进度失败', true);
    }
  }

  // 重置按钮点击事件
  resetButton.addEventListener('click', function() {
    if (confirm('确定要重置进度吗？这将清除所有已打招呼的记录。')) {
      resetProgress();
    }
  });

  // 更新进度显示
  function updateProgress(count) {
    const maxGreets = parseInt(maxGreetsDisplay.textContent);
    progressCount.textContent = count;
    progressBarInner.style.width = (count / maxGreets * 100) + '%';
    console.log('更新进度:', count);
  }

  // 恢复已保存的进度
  async function loadSavedProgress() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab || !tab.url.includes('zhipin.com')) {
        return; // 不在Boss直聘网站，不加载进度
      }
      
      chrome.tabs.sendMessage(tab.id, {action: 'getProgress'}, function(response) {
        if (chrome.runtime.lastError) {
          console.error('获取进度时出错:', chrome.runtime.lastError);
          return;
        }
        
        if (response && response.count !== undefined) {
          console.log('获取到保存的进度:', response);
          updateProgress(response.count);
          
          // 如果脚本正在运行，更新UI状态
          if (response.isRunning) {
            startButton.style.display = 'none';
            stopButton.style.display = 'block';
            progressBar.classList.add('active');
            showStatus('自动打招呼正在运行中');
          } else if (response.count > 0) {
            // 有进度但已暂停
            startButton.textContent = '继续打招呼';
            startButton.dataset.action = 'resume';
            progressBar.classList.add('active');
            showStatus('之前的进度已恢复，点击"继续打招呼"可继续');
          }
        }
      });
    } catch (error) {
      console.error('加载保存的进度时出错:', error);
    }
  }

  // 开始自动打招呼
  startButton.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab) {
        showStatus('无法获取当前标签页信息', true);
        return;
      }
      
      if (!tab.url.includes('zhipin.com')) {
        showStatus('请先打开BOSS直聘网站！', true);
        return;
      }

      // 显示状态
      const isResume = startButton.dataset.action === 'resume';
      showStatus(isResume ? '正在恢复自动打招呼...' : '正在启动自动打招呼...');
      
      // 发送开始或恢复消息给content script
      const action = isResume ? 'resumeAutoGreet' : 'startAutoGreet';
      
      chrome.tabs.sendMessage(tab.id, {action: action}, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送消息时出错:', chrome.runtime.lastError);
          showStatus('启动失败: ' + chrome.runtime.lastError.message, true);
          return;
        }
        
        if (response && (response.status === 'started' || response.status === 'resumed' || response.status === 'already_running')) {
          startButton.style.display = 'none';
          stopButton.style.display = 'block';
          progressBar.classList.add('active');
          
          // 如果是已经在运行，显示当前进度
          if (response.status === 'already_running' && response.count !== undefined) {
            updateProgress(response.count);
          }
          
          showStatus(isResume ? '自动打招呼已恢复' : '自动打招呼已启动');
        } else {
          showStatus('启动失败，请刷新页面后重试', true);
        }
      });
    } catch (error) {
      console.error('启动时出错:', error);
      showStatus('启动过程中发生错误: ' + error.message, true);
    }
  });

  // 停止自动打招呼
  stopButton.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab) {
        showStatus('无法获取当前标签页信息', true);
        return;
      }
      
      // 显示状态
      showStatus('正在停止自动打招呼...');
      
      chrome.tabs.sendMessage(tab.id, {action: 'stop'}, function(response) {
        if (chrome.runtime.lastError) {
          console.error('发送停止消息时出错:', chrome.runtime.lastError);
          showStatus('停止失败: ' + chrome.runtime.lastError.message, true);
          return;
        }
        
        if (response && response.status === 'stopped') {
          startButton.textContent = '继续打招呼';
          startButton.dataset.action = 'resume';
          startButton.style.display = 'block';
          stopButton.style.display = 'none';
          showStatus('自动打招呼已停止，可以稍后继续');
        } else {
          showStatus('停止失败，请刷新页面后重试', true);
        }
      });
    } catch (error) {
      console.error('停止时出错:', error);
      showStatus('停止过程中发生错误: ' + error.message, true);
    }
  });

  // 监听进度更新
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Popup收到消息:', request);
    
    if (request.type === 'progress') {
      updateProgress(request.count);
      if (sendResponse) sendResponse({received: true});
    } else if (request.type === 'complete') {
      updateProgress(100);
      showStatus('已完成100次打招呼！');
      startButton.textContent = '重新开始'; 
      startButton.dataset.action = 'start';
      startButton.style.display = 'block';
      stopButton.style.display = 'none';
      if (sendResponse) sendResponse({received: true});
    } else if (request.type === 'needNextPage') {
      showStatus('当前页面的职位已处理完，请翻到下一页后继续。');
      if (sendResponse) sendResponse({received: true});
    }
    
    return true;
  });
  
  // 初始化检查
  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (tab && !tab.url.includes('zhipin.com')) {
        showStatus('请打开BOSS直聘网站后使用此插件', true);
        startButton.disabled = true;
      } else {
        startButton.disabled = false;
        // 加载已保存的进度
        loadSavedProgress();
      }
    } catch (error) {
      console.error('检查当前标签页时出错:', error);
    }
  }
  
  // 初始检查
  checkCurrentTab();

  console.log('DOM加载完成，初始化QR码点击事件');
  
  // 获取元素
  const alipayQr = document.getElementById('alipayQr');
  const wechatQr = document.getElementById('wechatQr');
  const alipayModal = document.getElementById('alipayModal');
  const wechatModal = document.getElementById('wechatModal');
  const closeAlipay = document.getElementById('closeAlipay');
  const closeWechat = document.getElementById('closeWechat');
  
  // 支付宝点击事件
  if(alipayQr) {
    console.log('找到支付宝QR码元素');
    alipayQr.addEventListener('click', function() {
      console.log('点击了支付宝收款码');
      if(alipayModal) {
        alipayModal.style.display = 'block';
        console.log('显示支付宝模态框');
      }
    });
  } else {
    console.error('未找到支付宝QR码元素');
  }
  
  // 微信点击事件
  if(wechatQr) {
    console.log('找到微信QR码元素');
    wechatQr.addEventListener('click', function() {
      console.log('点击了微信收款码');
      if(wechatModal) {
        wechatModal.style.display = 'block';
        console.log('显示微信模态框');
      }
    });
  } else {
    console.error('未找到微信QR码元素');
  }
  
  // 关闭按钮事件
  if(closeAlipay) {
    closeAlipay.addEventListener('click', function() {
      console.log('点击关闭支付宝模态框');
      if(alipayModal) {
        alipayModal.style.display = 'none';
      }
    });
  }
  
  if(closeWechat) {
    closeWechat.addEventListener('click', function() {
      console.log('点击关闭微信模态框');
      if(wechatModal) {
        wechatModal.style.display = 'none';
      }
    });
  }
  
  // 点击模态框背景关闭
  window.addEventListener('click', function(event) {
    if (event.target === alipayModal) {
      alipayModal.style.display = 'none';
      console.log('点击背景关闭支付宝模态框');
    }
    if (event.target === wechatModal) {
      wechatModal.style.display = 'none';
      console.log('点击背景关闭微信模态框');
    }
  });
  
  console.log('QR码事件监听器初始化完成');

  // 初始化时加载设置
  loadSettings();
}); 