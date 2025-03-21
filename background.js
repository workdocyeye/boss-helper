/**
 * 我来直聘 - 后台服务
 * @author 叶俊宇 <ye1026789747@Gmail.com>
 * @copyright 2024 叶俊宇
 * @license MIT
 */

// 监听来自popup或content script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('后台脚本收到消息:', request);
  
  if (request.type === 'progress' || request.type === 'complete' || request.type === 'needNextPage') {
    // 转发消息给popup
    try {
      chrome.runtime.sendMessage(request)
        .catch(error => console.error('转发消息给popup时出错:', error));
      console.log('后台脚本已转发消息:', request);
    } catch (error) {
      console.error('转发消息时出错:', error);
    }
  }
  
  // 返回消息处理状态
  if (sendResponse) {
    try {
      sendResponse({received: true});
    } catch (error) {
      console.error('发送响应时出错:', error);
    }
  }
  
  return true;
});

// 监听标签页更新事件，便于调试
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('zhipin.com')) {
    console.log('BOSS直聘页面已加载完成:', tab.url);
  }
}); 