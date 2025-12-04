document.addEventListener('DOMContentLoaded', () => {
    initDiscover();
});

function initDiscover() {
    setupExpandableNav();
    setupBookmarks();
    setupCardClicks();
    setupPanelButtons();
}

// Expandable navigation items
function setupExpandableNav() {
    const expandableItems = document.querySelectorAll('.discover-nav-item-expandable');
    expandableItems.forEach(item => {
        const header = item.querySelector('.discover-nav-header');
        const caret = item.querySelector('.nav-caret');
        
        if (header && caret) {
            header.addEventListener('click', () => {
                const isExpanded = item.classList.contains('expanded');
                
                // Close all other expandable items
                expandableItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('expanded');
                        const otherCaret = otherItem.querySelector('.nav-caret');
                        if (otherCaret) otherCaret.textContent = '▼';
                    }
                });
                
                // Toggle current item
                if (isExpanded) {
                    item.classList.remove('expanded');
                    caret.textContent = '▼';
                } else {
                    item.classList.add('expanded');
                    caret.textContent = '▲';
                }
            });
        }
    });
}

// Bookmark toggle functionality
function setupBookmarks() {
    const bookmarks = document.querySelectorAll('.discover-card-bookmark');
    bookmarks.forEach(bookmark => {
        bookmark.addEventListener('click', (e) => {
            e.stopPropagation();
            const isBookmarked = bookmark.textContent === '🔖';
            bookmark.textContent = isBookmarked ? '🔖✓' : '🔖';
            bookmark.style.background = isBookmarked ? '#8b5cf6' : 'rgba(255, 255, 255, 0.95)';
            
            const card = bookmark.closest('.discover-card');
            const cardType = card.getAttribute('data-card');
            console.log(`Bookmark ${isBookmarked ? 'added' : 'removed'} for ${cardType}`);
        });
    });
}

// Card click functionality
function setupCardClicks() {
    const cards = document.querySelectorAll('.discover-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const cardType = card.getAttribute('data-card');
            const title = card.querySelector('.discover-card-title').textContent;
            
            // Navigate or show details based on card type
            switch(cardType) {
                case 'testimonials':
                    alert(`Demo: Viewing ${title} - This would show user testimonials`);
                    break;
                case 'tips':
                    alert(`Demo: Viewing ${title} - This would show safety tips`);
                    break;
                case 'contacts':
                    alert(`Demo: Viewing ${title} - This would show emergency contacts`);
                    break;
                case 'guide':
                    alert(`Demo: Viewing ${title} - This would show nighttime travel guide`);
                    break;
                default:
                    alert(`Demo: Viewing ${title}`);
            }
        });
    });
}

// Panel button functionality
function setupPanelButtons() {
    const exploreBtn = document.querySelector('.panel-btn-secondary');
    const getStartedBtn = document.querySelector('.panel-btn-primary');

    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            alert('Demo: Explore Features clicked - This would show all app features');
        });
    }

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            window.location.href = '/login';
        });
    }
}

