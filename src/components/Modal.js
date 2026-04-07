import React, { useState, useEffect } from 'react';

const Modal = ({ isOpen, onClose, onSave, onDelete, event, date, events }) => {
    // --- [상태 관리] ---
    const [formData, setFormData] = useState({
        id: '', title: '', date: date || '', startTime: '10:00', endTime: '11:00',
        tag: '기본', color: '#b5ead7', memo: '',
        notifyBefore: 'none', repeat: 'none',
        isDday: false
    });

    // 사용자 설정 태그를 입력하는지 판별하는 함수
    const [isCustomTag, setIsCustomTag] = useState(false);

    // 정말 삭제하시겠습니까? 표기
    const [isDeleting, setIsDeleting] = useState(false);

    // 삭제의 범위를 기억하는 코드
    const [deleteScope, setDeleteScope] = useState('single');

    // 색상 팔레트
    const palette = ['#b5ead7', '#ffb7b2', '#ffdac1', '#e2f0cb', '#c7ceea', '#ffd1dc'];

    // 모달 열릴 때 기존 데이터 덮어씌우기
    useEffect(() => {
        setIsDeleting(false);
        if (event) {
            const defaultTags = ['기본', '공부', '운동', '약속', '업무'];
            const isCustom = !defaultTags.includes(event.tag);
            setIsCustomTag(isCustom);
            setFormData({ ...event, customTag: isCustom ? event.tag : '' });
        } else {
            setFormData(prev => ({ ...prev, id: `evt_${Date.now()}`, date: date || '', repeat: 'none' }));
        }
    }, [event, date]);

    // 일반 입력값 변경 핸들러
    const handleChange = (e) => {
        const {name, value, type, checked} = e.target;
        if (name === 'tag' && value === 'custom') {
            setIsCustomTag(true);
            return;
        } else if (name === 'tag') {
            setIsCustomTag(false);
        }
        setFormData({...formData, [name]: type === 'checkbox' ? checked : value});
    };

    // 일정 중복 방지 로직
    const isOverlapping = (newEvent, events) => {
        return events.some(evt => {
            if (evt.date !== newEvent.date) return false;

            // 수정 모드일 때 자기 자신 제외
            if (event && evt.id === event.id) return false;

            const startA = new Date(`1970-01-01T${evt.startTime}`);
            const endA = new Date(`1970-01-01T${evt.endTime}`);

            const startB = new Date(`1970-01-01T${newEvent.startTime}`);
            const endB = new Date(`1970-01-01T${newEvent.endTime}`);

            return startA < endB && endA > startB;
        });
    };

    // 저장 전 검증 핸들러
    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.title.trim()) return alert("제목을 입력해주세요!");
        if (formData.startTime >= formData.endTime) return alert("종료 시간은 시작 시간보다 늦어야 합니다.");

        // 🔥 겹침 검사 추가
        if (isOverlapping(formData, events)) {
            return alert("⛔ 해당 시간에 이미 일정이 있어요!");
        }

        const finalData = { ...formData };

        if (isCustomTag) {
            if (!formData.customTag.trim()) return alert("태그를 입력해주세요!");
            finalData.tag = formData.customTag;
        }

        onSave(finalData);
    };

    const handleFinalDelete = () => {
        onDelete(formData, deleteScope);
    };

    // --- [친절한 시간 드롭다운을 위한 헬퍼 함수] ---
    // "14:30" 데이터를 -> { ampm: "오후", hour: "02", min: "30" } 변환
    const parseTime = (timeStr) => {
        if(!timeStr) return { ampm: '오전', hour: '12', min: '00' };
        let [h, m] = timeStr.split(':');
        h = parseInt(h, 10);
        return {
            ampm: h >= 12 ? '오후' : '오전',
            hour: String(h === 0 ? 12 : (h > 12 ? h - 12 : h)).padStart(2, '0'),
            min: m
        };
    };

    // 개별 선택된 값을 다시 "14:30" 포맷으로 병합
    const formatTime = (ampm, hour, min) => {
        let h = parseInt(hour, 10);
        if (ampm === '오후' && h !== 12) h += 12;
        if (ampm === '오전' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${min}`;
    };

    // 시간 드롭다운 변경 시 상태 업데이트 핸들러
    const handleTimeChange = (type, field, value) => {
        const currentParts = parseTime(formData[type]);
        currentParts[field] = value;
        const newTimeStr = formatTime(currentParts.ampm, currentParts.hour, currentParts.min);
        setFormData({ ...formData, [type]: newTimeStr });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                {/* --- [삭제 모드 뷰] --- */}
                {isDeleting ? (
                    <div className="delete-confirm-container">
                        <h3>🗑️ 일정 삭제</h3>

                        {/* 반복 일정 여부 체크 */}
                        {event?.repeat && event.repeat !== 'none' ? (
                            <>
                                <p className="delete-description">
                                    📌 이 일정은 반복 일정입니다.<br />
                                    삭제 범위를 선택해주세요.
                                </p>

                                <div className="delete-options">

                                    <button
                                        type="button"
                                        className={`delete-option ${deleteScope === 'single' ? 'active' : ''}`}
                                        onClick={() => setDeleteScope('single')}
                                    >
                                        🗓️ 이 일정만 삭제
                                        <span>선택한 날짜의 일정만 삭제됩니다</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`delete-option ${deleteScope === 'future' ? 'active' : ''}`}
                                        onClick={() => setDeleteScope('future')}
                                    >
                                        ⏭️ 이후 일정 삭제
                                        <span>이 날짜 이후 반복 일정 모두 삭제</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`delete-option danger ${deleteScope === 'all' ? 'active' : ''}`}
                                        onClick={() => setDeleteScope('all')}
                                    >
                                        🗑️ 전체 삭제
                                        <span>모든 반복 일정이 삭제됩니다</span>
                                    </button>

                                </div>
                            </>
                        ) : (
                            <>
                                <p className="delete-description">
                                    📌 이 일정은 단일 일정입니다.<br />
                                    삭제하면 복구할 수 없습니다.
                                </p>
                            </>
                        )}

                        {/* 공통 버튼 영역 */}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="delete-btn"
                                onClick={handleFinalDelete}
                            >
                                삭제
                            </button>

                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => setIsDeleting(false)}
                            >
                                취소
                            </button>
                        </div>
                    </div>
                ) : (

                    /* --- [일정 생성 및 수정 뷰] --- */
                    <>
                        <h2>{event ? "일정 수정" : "새 일정 생성"}</h2>
                        <form onSubmit={handleSubmit} className="event-form">

                            <label>📌 제목: <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="일정 제목을 입력하세요" /></label>
                            <label>📅 날짜: <input type="date" name="date" value={formData.date} onChange={handleChange} required /></label>

                            {/* 친절한 시작/종료 시간 드롭다운 UI */}
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>🕒 시작 시간</label>
                                    <div className="time-picker-group">
                                        <select value={parseTime(formData.startTime).ampm} onChange={(e) => handleTimeChange('startTime', 'ampm', e.target.value)}>
                                            <option value="오전">오전</option><option value="오후">오후</option>
                                        </select>
                                        <select value={parseTime(formData.startTime).hour} onChange={(e) => handleTimeChange('startTime', 'hour', e.target.value)}>
                                            {Array.from({length: 12}, (_, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{i+1}시</option>)}
                                        </select>
                                        <select
                                            value={parseTime(formData.endTime).min}
                                            onChange={(e) => handleTimeChange('endTime', 'min', e.target.value)}
                                        >
                                            {Array.from({ length: 60 }, (_, i) => {
                                                const m = String(i).padStart(2, '0');
                                                return <option key={m} value={m}>{m}분</option>;
                                            })}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group flex-1">
                                    <label>🕒 종료 시간</label>
                                    <div className="time-picker-group">
                                        <select value={parseTime(formData.endTime).ampm} onChange={(e) => handleTimeChange('endTime', 'ampm', e.target.value)}>
                                            <option value="오전">오전</option><option value="오후">오후</option>
                                        </select>
                                        <select value={parseTime(formData.endTime).hour} onChange={(e) => handleTimeChange('endTime', 'hour', e.target.value)}>
                                            {Array.from({length: 12}, (_, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{i+1}시</option>)}
                                        </select>
                                        <select
                                            value={parseTime(formData.startTime).min}
                                            onChange={(e) => handleTimeChange('startTime', 'min', e.target.value)}
                                        >
                                            {Array.from({ length: 60 }, (_, i) => {
                                                const m = String(i).padStart(2, '0');
                                                return <option key={m} value={m}>{m}분</option>;
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <label>📝 메모: <textarea name="memo" value={formData.memo} onChange={handleChange} placeholder="추가 사항을 적어주세요" rows="2" /></label>

                            {/* --- [설정 그룹화 영역] 태그, 알람, 색상, 반복을 한 박스에 담음 --- */}
                            <div className="settings-box">
                                <div className="form-row">
                                    <div className="form-group flex-1">
                                        <label>🏷️ 태그</label>
                                        <select name="tag" value={isCustomTag ? "custom" : formData.tag} onChange={handleChange}>
                                            <option value="기본">기본</option>
                                            <option value="공부">📚 공부</option>
                                            <option value="운동">💪 운동</option>
                                            <option value="약속">☕ 약속</option>
                                            <option value="업무">💼 업무</option>
                                            <option value="custom">✍️ 직접 입력...</option>
                                        </select>
                                        {isCustomTag && <input type="text" name="customTag" value={formData.customTag} onChange={handleChange} placeholder="나만의 태그 입력" className="custom-tag-input" style={{marginTop: '5px'}} />}
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>🔔 알람 설정</label>
                                        <select name="notifyBefore" value={formData.notifyBefore} onChange={handleChange}>
                                            <option value="none">알람 없음</option>
                                            <option value="3">3분 전</option>
                                            <option value="5">5분 전</option>
                                            <option value="10">10분 전</option>
                                            <option value="15">15분 전</option>
                                            <option value="30">30분 전</option>
                                            <option value="60">1시간 전</option>
                                            <option value="120">2시간 전</option>
                                            <option value="1440">하루 전</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="dday-wrapper">
                                    <label className="dday-inline">
                                        <span>🎯 D-Day 표시</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.isDday}
                                            onChange={(e) =>
                                                setFormData({ ...formData, isDday: e.target.checked })
                                            }
                                        />
                                    </label>
                                </div>
                                <div className="form-row">
                                    <div className="form-group flex-1">
                                        <label>🎨 일정 색상</label>
                                        <div className="color-palette">
                                            {palette.map(col => (
                                                <div
                                                    key={col}
                                                    className={`color-dot ${formData.color === col ? 'active' : ''}`}
                                                    style={{ backgroundColor: col }}
                                                    onClick={() => setFormData({ ...formData, color: col })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {!event && (
                                        <div className="form-group flex-1">
                                            <label>🔁 반복</label>
                                            <select name="repeat" value={formData.repeat} onChange={handleChange}>
                                                <option value="none">반복 안함</option>
                                                <option value="weekly">매주 반복</option>
                                                <option value="monthly">매월 반복</option>
                                                <option value="yearly">매년 반복</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* --- 설정 그룹화 영역 끝 --- */}

                            <div className="modal-actions">
                                <button type="submit" className="save-btn">{event ? "수정" : "저장"}</button>
                                {event && <button type="button" className="delete-btn" onClick={() => setIsDeleting(true)}>삭제</button>}
                                <button type="button" className="cancel-btn" onClick={onClose}>닫기</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default React.memo(Modal);