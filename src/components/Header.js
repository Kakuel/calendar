import React, { useEffect } from 'react';

/**
 * Header 컴포넌트: 로고, 오늘 이동 버튼, 다크 모드 스위치를 포함합니다.
 */
const Header = ({ setCurrentDate, isDarkMode, toggleDarkMode }) => {

    // [효과] 다크 모드 상태 변화에 따라 body 태그의 클래스를 직접 제어
    // 이를 통해 .app-container 바깥의 브라우저 배경까지 모두 어둡게 처리합니다.
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    // 'Today' 클릭 시 현재 날짜로 설정
    const handleGoToday = () => {
        setCurrentDate(new Date());
    };

    return (
        <header className="global-header">
            <div className="header-inner">
                <div className="logo">📅 puki's Barbecue time 🍖</div>
                <nav className="header-nav">
                    <span className="nav-btn" onClick={handleGoToday}>Today</span>

                    {/* 다크 모드 토글 스위치 */}
                    <label className="theme-switch">
                        <span className="theme-label">{isDarkMode ? '🌙 Dark' : '☀️ Light'}</span>
                        <input type="checkbox" checked={isDarkMode} onChange={toggleDarkMode} />
                        <span className="slider round"></span>
                    </label>
                </nav>
            </div>
        </header>
    );
};

export default Header;