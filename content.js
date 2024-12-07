// Wrap the entire content script in an IIFE with error handling
(function initializeExtension() {
  // Check if the extension context is still valid
  if (chrome.runtime.id === undefined) {
    console.log('Extension context invalidated, cleaning up...');
    cleanupExtension();
    return;
  }

  // Add error listener for context invalidation
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.type === 'UPDATE_TEXT') {
        const input = document.getElementById('everpresent-input');
        if (input) {
          input.value = message.text;
          const container = document.getElementById('everpresent-container');
          if (container) {
            adjustBarWidth(message.text, input, container);
          }
        }
      }
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  });

  // Error handling function
  function handleError(error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log('Extension context invalidated, cleaning up...');
      cleanupExtension();
    } else {
      console.error('Error:', error);
    }
  }

  // Cleanup function to remove extension elements
  function cleanupExtension() {
    try {
      const bar = document.getElementById('everpresent-bar');
      if (bar) {
        bar.remove();
      }
      // Clear any running timers or listeners
      if (window.everpresentTimers) {
        for (const timer of window.everpresentTimers) {
          clearTimeout(timer);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Store timers for cleanup
  window.everpresentTimers = new Set();

  function createTextBar() {
    try {
      const bar = document.createElement('div');
      bar.id = 'everpresent-bar';
      
      // Keep bar fixed in top center
      bar.style.top = '8px';
      bar.style.left = '50%';
      bar.style.transform = 'translateX(-50%)';
      
      // Create container
      const container = document.createElement('div');
      container.id = 'everpresent-container';
      
      // Create collapse dot
      const collapseDot = document.createElement('div');
      collapseDot.className = 'collapse-dot';
      
      // Create input container
      const inputContainer = document.createElement('div');
      inputContainer.className = 'input-container';
      
      const input = document.createElement('input');
      input.id = 'everpresent-input';
      input.type = 'text';
      input.placeholder = 'Type your text here...';
      inputContainer.appendChild(input);
      
      // Create eyes container
      const eyesContainer = document.createElement('div');
      eyesContainer.className = 'eyes-container';
      
      // Create two eyes with eyebrows
      const createEye = () => {
        const eye = document.createElement('div');
        eye.className = 'eye-icon';
        
        const eyebrow = document.createElement('div');
        eyebrow.className = 'eyebrow';
        
        const dot = document.createElement('div');
        dot.className = 'eye-dot';
        
        eye.appendChild(eyebrow);
        eye.appendChild(dot);
        return eye;
      };
      
      const leftEye = createEye();
      const rightEye = createEye();
      
      // Handle collapse/expand with persistence
      let isCollapsed = false;
      let savedWidth = null;
      
      // Load initial collapsed state with error handling
      chrome.storage.local.get(['everpresentCollapsed'])
        .then(result => {
          isCollapsed = result.everpresentCollapsed || false;
          if (isCollapsed) {
            container.classList.add('collapsed');
          }
        })
        .catch(error => {
          handleError(error);
        });
      
      const toggleCollapse = (event) => {
        // Don't toggle if clicking input
        if (event.target === input) return;
        
        isCollapsed = !isCollapsed;
        
        // Save collapsed state
        chrome.storage.local.set({ everpresentCollapsed: isCollapsed });
        
        if (isCollapsed) {
          container.classList.add('collapsed');
          savedWidth = container.style.width;
        } else {
          container.classList.remove('collapsed');
          // Ensure width is properly set after expanding
          setTimeout(() => {
            if (savedWidth) {
              container.style.width = savedWidth;
            }
            adjustBarWidth(input.value, input, container);
            input.focus();
          }, 50);
        }
      };
      
      // Add click handlers
      collapseDot.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse(e);
      });
      
      container.addEventListener('click', (event) => {
        if (isCollapsed) {
          toggleCollapse(event);
        }
      });
      
      // Prevent input clicks from collapsing
      input.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // Add components to container
      container.appendChild(collapseDot);
      container.appendChild(inputContainer);
      
      // Add eyes to container
      eyesContainer.appendChild(leftEye);
      eyesContainer.appendChild(rightEye);
      container.appendChild(eyesContainer);
      
      bar.appendChild(container);
      document.body.insertBefore(bar, document.body.firstChild);
      
      // Initial width adjustment
      if (input.value) {
        adjustBarWidth(input.value, input, container);
      }
      
      // Load saved text
      chrome.storage.local.get(['everpresentText'], result => {
        if (result.everpresentText) {
          input.value = result.everpresentText;
          adjustBarWidth(result.everpresentText, input, container);
        }
      });
      
      // Save text on input and adjust width with error handling
      input.addEventListener('input', e => {
        const text = e.target.value;
        chrome.storage.local.set({ everpresentText: text })
          .catch(error => {
            handleError(error);
          });
        adjustBarWidth(text, input, container);
      });
      
      // Expression configurations
      const expressions = {
        eyebrows: [
          { left: 'eyebrow-skeptical-left', right: 'eyebrow-skeptical-right' },
          { left: 'eyebrow-angry-concerned', right: 'eyebrow-angry-concerned' },
          { left: 'eyebrow-worried', right: 'eyebrow-worried' },
          { left: 'eyebrow-excited', right: 'eyebrow-excited' },
          { left: 'eyebrow-suspicious-left', right: 'eyebrow-suspicious-right' },
          { left: 'eyebrow-raised', right: 'eyebrow-raised-reverse' },
          { left: 'eyebrow-angry', right: 'eyebrow-angry-reverse' },
          { left: 'eyebrow-sad', right: 'eyebrow-sad-reverse' }
        ],
        eyes: [
          'eye-happy',
          'eye-suspicious',
          'eye-excited',
          'eye-worried',
          'eye-looking-left',
          'eye-looking-right',
          'eye-looking-up',
          'eye-looking-down',
          'eye-scanning',
          'eye-blinking',
          'eye-suspicious-scanning'
        ],
        // Special combined expressions
        combined: [
          {
            eyebrows: { left: 'eyebrow-suspicious-left', right: 'eyebrow-suspicious-right' },
            eyes: 'eye-suspicious-scanning'
          },
          {
            eyebrows: { left: 'eyebrow-worried', right: 'eyebrow-worried' },
            eyes: 'eye-looking-up'
          },
          {
            eyebrows: { left: 'eyebrow-excited', right: 'eyebrow-excited' },
            eyes: 'eye-happy'
          }
        ]
      };
      
      // Function to set random expression
      const setRandomExpression = () => {
        // Only change expression 30% of the time when hovering links
        if (Math.random() > 0.3) return;
        
        // Clear previous expressions
        const eyebrows = container.querySelectorAll('.eyebrow');
        const dots = container.querySelectorAll('.eye-dot');
        
        // Reset classes
        for (const eyebrow of eyebrows) {
          eyebrow.className = 'eyebrow';
        }
        for (const dot of dots) {
          dot.className = 'eye-dot';
        }
        
        // 20% chance for combined expression
        if (Math.random() < 0.2) {
          const combinedExpression = expressions.combined[Math.floor(Math.random() * expressions.combined.length)];
          eyebrows[0].classList.add(combinedExpression.eyebrows.left);
          eyebrows[1].classList.add(combinedExpression.eyebrows.right);
          for (const dot of dots) {
            dot.classList.add(combinedExpression.eyes);
          }
        } else {
          // 70% chance for eyebrow expression
          if (Math.random() < 0.7) {
            const eyebrowStyle = expressions.eyebrows[Math.floor(Math.random() * expressions.eyebrows.length)];
            if (eyebrowStyle.left) {
              eyebrows[0].classList.add(eyebrowStyle.left);
            }
            if (eyebrowStyle.right) {
              eyebrows[1].classList.add(eyebrowStyle.right);
            }
          }
          
          // 60% chance for eye expression
          if (Math.random() < 0.6) {
            const eyeStyle = expressions.eyes[Math.floor(Math.random() * expressions.eyes.length)];
            // Some expressions should be applied to both eyes
            if (['eye-happy', 'eye-suspicious', 'eye-excited', 'eye-worried', 'eye-blinking'].includes(eyeStyle)) {
              for (const dot of dots) {
                dot.classList.add(eyeStyle);
              }
            } else {
              // Random chance to apply to one or both eyes
              if (Math.random() < 0.5) {
                dots[Math.floor(Math.random() * dots.length)].classList.add(eyeStyle);
              } else {
                for (const dot of dots) {
                  dot.classList.add(eyeStyle);
                }
              }
            }
          }
        }
        
        // Reset expressions after a delay
        setTimeout(() => {
          for (const eyebrow of eyebrows) {
            eyebrow.className = 'eyebrow';
          }
          for (const dot of dots) {
            dot.className = 'eye-dot';
          }
        }, 2000);
      };
      
      // Add mouse tracking for eyes
      let lastMouseX = 0;
      let lastMouseY = 0;
      let animationFrame;
      let lastHoveredElement = null;
      let lastExpressionTime = 0;

      document.addEventListener('mousemove', e => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        // Check for link hover
        const hoveredElement = document.elementFromPoint(lastMouseX, lastMouseY);
        const currentTime = Date.now();
        
        if (hoveredElement && 
            hoveredElement.tagName === 'A' && 
            hoveredElement !== lastHoveredElement && 
            currentTime - lastExpressionTime > 4000) {
          lastHoveredElement = hoveredElement;
          lastExpressionTime = currentTime;
          setRandomExpression();
        } else if (!hoveredElement || hoveredElement.tagName !== 'A') {
          lastHoveredElement = null;
        }
        
        if (!animationFrame) {
          animationFrame = requestAnimationFrame(() => {
            const dots = eyesContainer.querySelectorAll('.eye-dot');
            if (!dots.length) return;

            for (const dot of dots) {
              const eyeRect = dot.closest('.eye-icon').getBoundingClientRect();
              const eyeCenterX = eyeRect.left + eyeRect.width / 2;
              const eyeCenterY = eyeRect.top + eyeRect.height / 2;
              
              // Calculate angle between mouse and eye center
              const angle = Math.atan2(lastMouseY - eyeCenterY, lastMouseX - eyeCenterX);
              
              // Calculate dot movement with easing
              const distance = Math.min(2, Math.hypot(lastMouseX - eyeCenterX, lastMouseY - eyeCenterY) / 15);
              const dotX = Math.cos(angle) * distance;
              const dotY = Math.sin(angle) * distance;
              
              // Apply transform to dot
              dot.style.transform = `translate(${dotX}px, ${dotY}px)`;
            }
            
            animationFrame = null;
          });
        }
      });
      
      // Modify the randomExpressionInterval to store timer references
      const randomExpressionInterval = () => {
        const delay = 15000 + Math.random() * 15000; // 15-30 seconds
        const timer = setTimeout(() => {
          setRandomExpression();
          const nextTimer = randomExpressionInterval();
          window.everpresentTimers.add(nextTimer);
          window.everpresentTimers.delete(timer);
        }, delay);
        return timer;
      };

      const initialTimer = randomExpressionInterval();
      window.everpresentTimers.add(initialTimer);

    } catch (error) {
      handleError(error);
    }
  }

  // Initialize the extension
  try {
    createTextBar();
  } catch (error) {
    handleError(error);
  }

  // Add listener for extension unload
  window.addEventListener('unload', cleanupExtension);
})();

// Function to adjust bar width based on text content
function adjustBarWidth(text, input, container) {
  if (!text) {
    container.style.width = '200px'; // Set minimum width
    return;
  }
  
  // Create temporary span to measure text width
  const span = document.createElement('span');
  span.style.cssText = `
    font: ${window.getComputedStyle(input).font};
    visibility: hidden;
    position: fixed;
    left: -9999px;
    top: -9999px;
    white-space: pre;
    padding: 0;
    margin: 0;
    border: 0;
    letter-spacing: 0.03em;
  `;
  span.textContent = text;
  document.body.appendChild(span);
  
  // Get the actual text width
  const textWidth = span.getBoundingClientRect().width;
  
  // Clean up
  document.body.removeChild(span);
  
  // Calculate container width with fixed padding values
  const PADDING = {
    dot: 30,      // Left dot width
    eyes: 60,     // Eyes container width
    textLeft: 20, // Left text padding
    textRight: 20,// Right text padding
    safety: 20    // Extra safety margin
  };
  
  // Calculate total width needed
  const totalPadding = PADDING.dot + PADDING.eyes + PADDING.textLeft + PADDING.textRight + PADDING.safety;
  const newWidth = Math.ceil(textWidth + totalPadding);
  
  // Set minimum width and maximum width (90% of viewport)
  const minWidth = 200;
  const maxWidth = Math.min(window.innerWidth * 0.9, 800); // Cap at 800px or 90% of viewport
  const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
  
  // Update container width
  container.style.width = `${finalWidth}px`;
  
  // Calculate available width for input
  const availableWidth = finalWidth - PADDING.dot - PADDING.eyes - PADDING.textLeft - PADDING.textRight;
  
  // Set input width
  input.style.width = `${availableWidth}px`;
} 