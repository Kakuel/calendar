import React, { useState } from 'react';
import Header from './components/Header';
import Calendar from './components/Calendar';
import './index.css';

/**
 * App 컴포넌트: 앱의 전체 구조(레이아웃)와 공통 상태(날짜, 테마)를 정의합니다.
 */
function App() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDarkMode, setIsDarkMode] = useState(false);

    // 테마 토글 함수
    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        // 다크 모드 클래스를 최상위 컨테이너에 적용
        <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
            {/* 헤더: 오늘로 이동, 테마 토글, body 클래스 제어 로직 포함 */}
            <Header
                setCurrentDate={setCurrentDate}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
            />

            {/* 메인: 달력 핵심 기능 담당 */}
            <main className="app-main">
                <Calendar currentDate={currentDate} setCurrentDate={setCurrentDate} />
            </main>

            {/* 푸터: 단순 정보 표시 */}
            <footer className="global-footer">
                <p>© 2026 Pastel Planner. All rights reserved.</p>
                <p>Designed for a better daily life.</p>
            </footer>
        </div>
    );
}

export default App;