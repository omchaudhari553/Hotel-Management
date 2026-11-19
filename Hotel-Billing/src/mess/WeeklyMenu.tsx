import React, { useState, useEffect } from 'react';
import { messService } from '../services/messService';
import { MessMenu } from '../types';
import { Modal } from '../common/Modal';
import { useToast } from '../context/ToastContext';
import {
  Edit3,
  Copy,
  StickyNote,
  Plus,
  X,
} from 'lucide-react';

type SpecialMeal = {
  id: string;
  dayOfWeek: string;
  title: string;
  description: string;
};

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const MENU_STORAGE_KEY = 'weekly_menu_current';
const PREVIOUS_MENU_STORAGE_KEY = 'weekly_menu_previous';
const SPECIAL_MEALS_STORAGE_KEY = 'weekly_special_meals';
const WEEKLY_NOTE_STORAGE_KEY = 'weekly_menu_note';

export const WeeklyMenu: React.FC = () => {
  const [menus, setMenus] = useState<MessMenu[]>([]);

  // Normal menu modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Special meal modal
  const [isSpecialMealModalOpen, setIsSpecialMealModalOpen] = useState(false);

  // Weekly note modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const [isCopying, setIsCopying] = useState(false);

  const [editingItem, setEditingItem] = useState<Partial<MessMenu>>({
    businessId: 1,
    dayOfWeek: 'MONDAY',
    mealTime: 'LUNCH',
    itemsDescription: '',
    special: false,
  });

  const [specialMeals, setSpecialMeals] = useState<SpecialMeal[]>([]);
  const [editingSpecialMeal, setEditingSpecialMeal] = useState<SpecialMeal | null>(null);

  const [weeklyNote, setWeeklyNote] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const { showToast } = useToast();

  // --------------------------------------------------
  // LOAD MENU
  // --------------------------------------------------

  const loadMenu = async () => {
    try {
      const savedCurrentMenu = localStorage.getItem(MENU_STORAGE_KEY);

      if (savedCurrentMenu) {
        setMenus(JSON.parse(savedCurrentMenu));
      } else {
        const data = await messService.getWeeklyMenu(1);
        const menuData = Array.isArray(data) ? data : [];

        setMenus(menuData);

        localStorage.setItem(
          MENU_STORAGE_KEY,
          JSON.stringify(menuData)
        );

        // First menu becomes the "previous week"
        // if one doesn't already exist.
        if (!localStorage.getItem(PREVIOUS_MENU_STORAGE_KEY)) {
          localStorage.setItem(
            PREVIOUS_MENU_STORAGE_KEY,
            JSON.stringify(menuData)
          );
        }
      }

      const savedSpecialMeals = localStorage.getItem(
        SPECIAL_MEALS_STORAGE_KEY
      );

      if (savedSpecialMeals) {
        setSpecialMeals(JSON.parse(savedSpecialMeals));
      }

      const savedNote = localStorage.getItem(
        WEEKLY_NOTE_STORAGE_KEY
      );

      if (savedNote) {
        setWeeklyNote(savedNote);
      }
    } catch {
      showToast('error', 'Failed to load weekly menu');
      setMenus([]);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // --------------------------------------------------
  // SAVE MENU
  // --------------------------------------------------

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingItem.itemsDescription?.trim()) {
      showToast('error', 'Menu description cannot be empty');
      return;
    }

    try {
      // Keep your existing service call
      await messService.saveMenuItem(editingItem);

      const updatedMenu = [...menus];

      const existingIndex = updatedMenu.findIndex(
        (menu) =>
          menu.dayOfWeek === editingItem.dayOfWeek &&
          menu.mealTime === editingItem.mealTime
      );

      const newItem = {
        ...editingItem,
        id:
          editingItem.id ||
          Date.now(),
        businessId: 1,
      } as MessMenu;

      if (existingIndex >= 0) {
        updatedMenu[existingIndex] = newItem;
      } else {
        updatedMenu.push(newItem);
      }

      setMenus(updatedMenu);

      localStorage.setItem(
        MENU_STORAGE_KEY,
        JSON.stringify(updatedMenu)
      );

      showToast('success', 'Menu updated successfully');

      setIsModalOpen(false);
    } catch {
      showToast('error', 'Failed to save menu');
    }
  };

  // --------------------------------------------------
  // COPY PREVIOUS WEEK
  // --------------------------------------------------

  const handleCopyPreviousWeek = () => {
    try {
      setIsCopying(true);

      const previousWeekData = localStorage.getItem(
        PREVIOUS_MENU_STORAGE_KEY
      );

      if (!previousWeekData) {
        showToast('error', 'Previous week menu is not available');
        return;
      }

      const previousMenu: MessMenu[] = JSON.parse(
        previousWeekData
      );

      const copiedMenu = previousMenu.map((item) => ({
        ...item,
        id: Date.now() + Math.random(),
        businessId: 1,
      }));

      setMenus(copiedMenu);

      localStorage.setItem(
        MENU_STORAGE_KEY,
        JSON.stringify(copiedMenu)
      );

      showToast(
        'success',
        'Previous week menu copied successfully'
      );
    } catch {
      showToast(
        'error',
        'Failed to copy previous week menu'
      );
    } finally {
      setIsCopying(false);
    }
  };

  // --------------------------------------------------
  // SPECIAL MEAL
  // --------------------------------------------------

  const openAddSpecialMeal = (day: string) => {
    setEditingSpecialMeal({
      id: '',
      dayOfWeek: day,
      title: '',
      description: '',
    });

    setIsSpecialMealModalOpen(true);
  };

  const openEditSpecialMeal = (meal: SpecialMeal) => {
    setEditingSpecialMeal(meal);
    setIsSpecialMealModalOpen(true);
  };

  const handleSaveSpecialMeal = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editingSpecialMeal?.title.trim()) {
      showToast(
        'error',
        'Special meal name cannot be empty'
      );
      return;
    }

    if (!editingSpecialMeal.description.trim()) {
      showToast(
        'error',
        'Special meal description cannot be empty'
      );
      return;
    }

    const meal = {
      ...editingSpecialMeal,
      id:
        editingSpecialMeal.id ||
        `${Date.now()}-${Math.random()}`,
    };

    const existingIndex = specialMeals.findIndex(
      (item) => item.id === meal.id
    );

    let updatedMeals: SpecialMeal[];

    if (existingIndex >= 0) {
      updatedMeals = [...specialMeals];
      updatedMeals[existingIndex] = meal;
    } else {
      updatedMeals = [...specialMeals, meal];
    }

    setSpecialMeals(updatedMeals);

    localStorage.setItem(
      SPECIAL_MEALS_STORAGE_KEY,
      JSON.stringify(updatedMeals)
    );

    setIsSpecialMealModalOpen(false);
    setEditingSpecialMeal(null);

    showToast(
      'success',
      existingIndex >= 0
        ? 'Special meal updated'
        : 'Special meal added'
    );
  };

  const handleDeleteSpecialMeal = (id: string) => {
    const updatedMeals = specialMeals.filter(
      (meal) => meal.id !== id
    );

    setSpecialMeals(updatedMeals);

    localStorage.setItem(
      SPECIAL_MEALS_STORAGE_KEY,
      JSON.stringify(updatedMeals)
    );

    showToast(
      'success',
      'Special meal removed'
    );
  };

  // --------------------------------------------------
  // WEEKLY NOTE
  // --------------------------------------------------

  const openWeeklyNote = () => {
    setNoteInput(weeklyNote);
    setIsNoteModalOpen(true);
  };

  const handleSaveWeeklyNote = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const cleanedNote = noteInput.trim();

    setWeeklyNote(cleanedNote);

    if (cleanedNote) {
      localStorage.setItem(
        WEEKLY_NOTE_STORAGE_KEY,
        cleanedNote
      );
    } else {
      localStorage.removeItem(
        WEEKLY_NOTE_STORAGE_KEY
      );
    }

    setIsNoteModalOpen(false);

    showToast(
      'success',
      'Weekly note updated'
    );
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#1C1917',
            }}
          >
            Weekly Mess & Tiffin Menu
          </h1>

          <p
            style={{
              color: '#57534E',
              fontSize: '0.9rem',
              marginTop: '2px',
            }}
          >
            Day-by-day breakfast, lunch, and dinner meal planner
          </p>
        </div>

        {/* FEATURE BUTTONS */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* COPY PREVIOUS WEEK */}
          <button
            type="button"
            onClick={handleCopyPreviousWeek}
            disabled={isCopying}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <Copy size={16} />

            {isCopying
              ? 'Copying...'
              : 'Copy Previous Week'}
          </button>

          {/* WEEKLY NOTE */}
          <button
            type="button"
            onClick={openWeeklyNote}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <StickyNote size={16} />
            Weekly Note
          </button>
        </div>
      </div>

      {/* WEEKLY NOTE DISPLAY */}
      {weeklyNote && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 800,
                color: '#92400E',
                fontSize: '0.78rem',
                marginBottom: '4px',
              }}
            >
              📌 WEEKLY NOTE
            </div>

            <div
              style={{
                color: '#44403C',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              {weeklyNote}
            </div>
          </div>

          <button
            type="button"
            onClick={openWeeklyNote}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#4D7C0F',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Edit3 size={15} />
          </button>
        </div>
      )}

      {/* WEEKLY MENU */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {DAYS.map((day) => {
          const lunch = menus.find(
            (m) =>
              m.dayOfWeek === day &&
              m.mealTime === 'LUNCH'
          );

          const dinner = menus.find(
            (m) =>
              m.dayOfWeek === day &&
              m.mealTime === 'DINNER'
          );

          const specialMeal = specialMeals.find(
            (meal) =>
              meal.dayOfWeek === day
          );

          return (
            <div
              key={day}
              className="card"
              style={{
                border: '1px solid #E7E5E4',
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* DAY HEADER */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#4D7C0F',
                  }}
                >
                  {day}
                </h3>
              </div>

              {/* LUNCH */}
              <div
                style={{
                  marginBottom: '16px',
                  background: '#F7FEE7',
                  border: '1px solid #E7E5E4',
                  padding: '12px',
                  borderRadius:
                    'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#4D7C0F',
                      textTransform: 'uppercase',
                    }}
                  >
                    🍛 Lunch Menu
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({
                        id: lunch?.id,
                        businessId: 1,
                        dayOfWeek: day,
                        mealTime: 'LUNCH',
                        itemsDescription:
                          lunch?.itemsDescription || '',
                        special:
                          lunch?.special || false,
                      });

                      setIsModalOpen(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4D7C0F',
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>

                <div
                  style={{
                    fontSize: '0.86rem',
                    color: '#1C1917',
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }}
                >
                  {lunch?.itemsDescription ||
                    'Sev Bhaji, Dal Tadka, Rice, Chapati, Salad'}
                </div>
              </div>

              {/* DINNER */}
              <div
                style={{
                  background: '#F7FEE7',
                  border: '1px solid #E7E5E4',
                  padding: '12px',
                  borderRadius:
                    'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#4D7C0F',
                      textTransform: 'uppercase',
                    }}
                  >
                    🍲 Dinner Menu
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({
                        id: dinner?.id,
                        businessId: 1,
                        dayOfWeek: day,
                        mealTime: 'DINNER',
                        itemsDescription:
                          dinner?.itemsDescription || '',
                        special:
                          dinner?.special || false,
                      });

                      setIsModalOpen(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4D7C0F',
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>

                <div
                  style={{
                    fontSize: '0.86rem',
                    color: '#1C1917',
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }}
                >
                  {dinner?.itemsDescription ||
                    'Paneer Butter Masala, Dal Fry, Jeera Rice, Phulka, Sweet'}
                </div>
              </div>

              {/* SPECIAL MEAL */}
              {specialMeal && (
                <div
                  style={{
                    marginTop: '12px',
                    background: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    padding: '12px',
                    borderRadius:
                      'var(--radius-md)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems: 'center',
                      marginBottom: '5px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#C2410C',
                        textTransform:
                          'uppercase',
                      }}
                    >
                      🍽️ Special Meal
                    </span>

                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openEditSpecialMeal(
                            specialMeal
                          )
                        }
                        style={{
                          background:
                            'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#C2410C',
                        }}
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteSpecialMeal(
                            specialMeal.id
                          )
                        }
                        style={{
                          background:
                            'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#C2410C',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: '#1C1917',
                      fontSize: '0.88rem',
                      marginBottom: '3px',
                    }}
                  >
                    {specialMeal.title}
                  </div>

                  <div
                    style={{
                      fontSize: '0.86rem',
                      color: '#44403C',
                      lineHeight: 1.5,
                    }}
                  >
                    {specialMeal.description}
                  </div>
                </div>
              )}

              {/* ADD SPECIAL MEAL */}
              {!specialMeal && (
                <button
                  type="button"
                  onClick={() =>
                    openAddSpecialMeal(day)
                  }
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '9px',
                    borderRadius: '8px',
                    border:
                      '1px dashed #A3A3A3',
                    background:
                      'transparent',
                    color: '#4D7C0F',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    justifyContent:
                      'center',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={15} />
                  Add Special Meal
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* NORMAL MENU MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() =>
          setIsModalOpen(false)
        }
        title={`Edit Menu (${editingItem.dayOfWeek} - ${editingItem.mealTime})`}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">
              Dish Items & Description *
            </label>

            <textarea
              required
              rows={4}
              className="textarea"
              placeholder="e.g. Paneer Butter Masala, Dal Makhani, Jeera Rice, Chapati (4), Gulab Jamun"
              value={
                editingItem.itemsDescription || ''
              }
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  itemsDescription:
                    e.target.value,
                })
              }
            />
          </div>

          <div
            className="modal-footer"
            style={{
              margin: '0 -24px -24px -24px',
              padding: '16px 24px',
            }}
          >
            <button
              type="button"
              onClick={() =>
                setIsModalOpen(false)
              }
              className="btn btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-mess"
            >
              Save Menu
            </button>
          </div>
        </form>
      </Modal>

      {/* SPECIAL MEAL MODAL */}
      <Modal
        isOpen={isSpecialMealModalOpen}
        onClose={() => {
          setIsSpecialMealModalOpen(false);
          setEditingSpecialMeal(null);
        }}
        title={
          editingSpecialMeal?.id
            ? `Edit Special Meal - ${editingSpecialMeal.dayOfWeek}`
            : `Add Special Meal - ${editingSpecialMeal?.dayOfWeek || ''}`
        }
      >
        <form
          onSubmit={handleSaveSpecialMeal}
        >
          <div className="form-group">
            <label className="form-label">
              Special Meal Name *
            </label>

            <input
              required
              className="input"
              placeholder="e.g. Sunday Special Thali"
              value={
                editingSpecialMeal?.title ||
                ''
              }
              onChange={(e) =>
                setEditingSpecialMeal(
                  (prev) =>
                    prev
                      ? {
                          ...prev,
                          title:
                            e.target.value,
                        }
                      : prev
                )
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Meal Items & Description *
            </label>

            <textarea
              required
              rows={4}
              className="textarea"
              placeholder="e.g. Paneer Tikka, Pulao, Raita, Gulab Jamun"
              value={
                editingSpecialMeal?.description ||
                ''
              }
              onChange={(e) =>
                setEditingSpecialMeal(
                  (prev) =>
                    prev
                      ? {
                          ...prev,
                          description:
                            e.target.value,
                        }
                      : prev
                )
              }
            />
          </div>

          <div
            className="modal-footer"
            style={{
              margin: '0 -24px -24px -24px',
              padding: '16px 24px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsSpecialMealModalOpen(
                  false
                );
                setEditingSpecialMeal(null);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-mess"
            >
              Save Special Meal
            </button>
          </div>
        </form>
      </Modal>

      {/* WEEKLY NOTE MODAL */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() =>
          setIsNoteModalOpen(false)
        }
        title="Weekly Note"
      >
        <form
          onSubmit={handleSaveWeeklyNote}
        >
          <div className="form-group">
            <label className="form-label">
              Weekly Note
            </label>

            <textarea
              rows={4}
              className="textarea"
              placeholder="e.g. Sunday dinner will be served at 8:30 PM due to a special event."
              value={noteInput}
              onChange={(e) =>
                setNoteInput(e.target.value)
              }
            />
          </div>

          <div
            className="modal-footer"
            style={{
              margin: '0 -24px -24px -24px',
              padding: '16px 24px',
            }}
          >
            <button
              type="button"
              onClick={() =>
                setIsNoteModalOpen(false)
              }
              className="btn btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-mess"
            >
              Save Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};