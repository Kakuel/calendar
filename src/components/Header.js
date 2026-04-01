import React from 'react';
import { useApp } from '../components/AppContext'; // Context 커스텀 훅 임포트

/**
 * Header 컴포넌트: 전역 상태(Context)에서 필요한 기능만 직접 구독합니다.
 */
const Header = () => {
    // 부모(App.js)가 넘겨주던 props 대신, Context에서 필요한 것만 골라 사용합니다.
    const { isDarkMode, toggleDarkMode, goToday } = useApp();

    return (
        <header className="global-header">
            <div className="header-inner">
                <div className="logo">📅 puki's Barbecue time 🍖</div>
                <nav className="header-nav">
                    {/* Context에서 가져온 goToday 함수를 직접 실행 */}
                    <span className="nav-btn" onClick={goToday}>Today</span>

                    <label className="theme-switch">
                        <span className="theme-label">{isDarkMode ? '🌙 Dark' : '☀️ Light'}</span>
                        <input
                            type="checkbox"
                            checked={isDarkMode}
                            onChange={toggleDarkMode}
                        />
                        <span className="slider round"></span>
                    </label>
                </nav>
            </div>
        </header>
    );
};

export default Header;