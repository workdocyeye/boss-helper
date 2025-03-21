// donate.js - 处理赞助功能
console.log('赞助脚本加载');

// 等待DOM完全加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，初始化赞助功能');
  
  // 获取DOM元素
  const donateBtn = document.getElementById('toggleDonateBtn');
  const donateArea = document.getElementById('donateArea');
  
  // 打印DOM元素状态
  console.log('赞助按钮元素:', donateBtn);
  console.log('赞助区域元素:', donateArea);
  
  if (!donateBtn) {
    console.error('找不到赞助按钮元素');
    return;
  }
  
  if (!donateArea) {
    console.error('找不到赞助区域元素');
    return;
  }
  
  // 添加点击事件
  donateBtn.addEventListener('click', function(e) {
    console.log('点击了赞助按钮');
    console.log('切换前状态:', donateArea.classList.contains('active'));
    
    // 切换显示状态
    donateArea.classList.toggle('active');
    
    console.log('切换后状态:', donateArea.classList.contains('active'));
    
    // 更新按钮文字
    this.textContent = donateArea.classList.contains('active') 
      ? '隐藏收款码' 
      : '赞助支持';
  });
  
  console.log('赞助功能初始化完成');
}); 