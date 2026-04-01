import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [events, setEvents] = useState([]);

    // 테마 변경 로직
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    // 앱 로드 시 이벤트 불러오기
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('calendar_events')) || [];
        setEvents(saved);
    }, []);

    // 알림 체크 로직 (윈도우 알림 호출)
    useEffect(() => {
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        const checkNotifications = () => {
            const now = new Date();

            setEvents(prevEvents =>
                prevEvents.map(event => {
                    if (!event.notifyBefore || event.notifyBefore === "none") return event;

                    const notifyTime = parseInt(event.notifyBefore);
                    const eventTime = new Date(`${event.date}T${event.startTime}:00`);
                    const diffMinutes = Math.floor((eventTime - now) / 60000);

                    // 알림 조건 (완화 + 중복 방지)
                    if (!event.notified && diffMinutes <= notifyTime && diffMinutes >= 0) {
                        if (Notification.permission === "granted") {
                            new Notification(`📅 [일정 알림] ${event.title}`, {
                                body: `${event.startTime}에 시작됩니다.`,
                                icon: '/logo192.png',
                            });
                        }

                        return { ...event, notified: true }; // 알림 완료 표시
                    }

                    return event;
                })
            );
        };

        const interval = setInterval(checkNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
    const goToday = () => setCurrentDate(new Date());

    return (
        <AppContext.Provider value={{
            currentDate, setCurrentDate,
            isDarkMode, toggleDarkMode,
            events, setEvents, // Calendar에서 사용할 수 있게 노출
            goToday
        }}>
            {children}
        </AppContext.Provider>
    );
};

// 커스텀 훅: 다른 컴포넌트에서 편하게 꺼내 쓰기 위함
export const useApp = () => useContext(AppContext);