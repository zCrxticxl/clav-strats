import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import MapLearnPage from './MapLearnPage';

jest.mock('../components/MapQuizPanel.css', () => ({}));
jest.mock('../data/maps', () => ({ ALL_MAPS: [
  { id: 'border', name: 'Border', floors: ['Ground Floor', '1st Floor'] },
  { id: 'clubhouse', name: 'Clubhouse', floors: ['Ground Floor'] },
] }));
jest.mock('../data/mapRoomCallouts', () => {
  const rooms = [
    { id: 'a', name: 'Waiting Room', centerX: 100, centerY: 200, path: 'M0 0h50v50z' },
    { id: 'b', name: 'East Stairs', centerX: 300, centerY: 400, path: 'M0 0h50v50z' },
  ];
  return { MAP_ROOM_CALLOUTS: {
    100: { mapId: 100, name: 'Border', floors: { 0: { rooms }, 1: { rooms } } },
    200: { mapId: 200, name: 'Clubhouse', floors: { 0: { rooms } } },
  } };
});

const STORAGE_KEY = 'clav-map-learn-v1';
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Map Learn personal callout layer', () => {
  let container;
  let root;
  const query = selector => container.querySelector(selector);
  const button = text => [...container.querySelectorAll('button')].find(item => item.textContent === text);
  const click = element => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const change = (element, value) => act(() => Simulate.change(element, { target: { value } }));
  const mount = () => act(() => root.render(<MapLearnPage />));
  const reload = () => {
    act(() => root.unmount());
    root = createRoot(container);
    mount();
  };
  const save = (roomIndex, name) => {
    click(container.querySelectorAll('.map-learn-callouts button')[roomIndex]);
    change(query('#custom-room-name'), name);
    act(() => Simulate.submit(query('form')));
  };

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test('saves multiple names, preserves official names, reloads and removes one name', () => {
    mount();
    save(0, '  Team Corner  ');
    save(1, 'Blue stairs');
    reload();
    expect([...container.querySelectorAll('.map-learn-custom-label')].map(el => el.textContent)).toEqual(['Team Corner', 'Blue stairs']);
    expect(query('.map-learn-room-label').textContent).toBe('Waiting Room');
    click(container.querySelectorAll('.map-learn-callouts button')[0]);
    expect(query('#custom-room-name').value).toBe('Team Corner');
    click(button('Remove'));
    reload();
    expect(query('.map-learn-custom-label').textContent).toBe('Blue stairs');
    expect(query('.map-learn-room-label').textContent).toBe('Waiting Room');
  });

  test('names stay scoped to their map, floor and room; switching clears the editor', () => {
    mount();
    save(0, 'Ground custom');
    click(button('1st Floor'));
    expect(query('#custom-room-name')).toBeNull();
    expect(query('.map-learn-custom-label')).toBeNull();
    save(0, 'Upstairs custom');
    change(query('select'), '200');
    expect(query('.map-learn-custom-label')).toBeNull();
    save(0, 'Clubhouse custom');
    change(query('select'), '100');
    expect(query('.map-learn-custom-label').textContent).toBe('Ground custom');
    click(button('1st Floor'));
    expect(query('.map-learn-custom-label').textContent).toBe('Upstairs custom');
  });

  test('independent layers keep labels separated and scale from 100 to 300 percent', () => {
    mount();
    save(0, 'Custom');
    const slider = query('#callout-size');
    expect([slider.min, slider.max, slider.value]).toEqual(['100', '300', '100']);
    expect(query('.map-learn-room-label').style.fontSize).toBe('28px');
    change(slider, '300');
    expect(query('.map-learn-room-label').style.fontSize).toBe('84px');
    expect(query('.map-learn-custom-label').style.fontSize).toBe('84px');
    expect(query('.map-learn-custom-label').getAttribute('y')).toBe('320');
    click(button('Default'));
    expect(query('.map-learn-room-label').classList.contains('hidden')).toBe(true);
    expect(query('.map-learn-custom-label').getAttribute('y')).toBe('200');
    click(button('Custom'));
    expect(query('.map-learn-custom-label')).toBeNull();
    reload();
    expect(query('#callout-size').value).toBe('300');
  });

  test('quiz hides custom names and still checks the official answer', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    mount();
    save(0, 'Secret alias');
    click(button('Quiz'));
    click(button('Type Name'));
    click(button('Start practice'));
    expect(query('.map-learn-custom-label')).toBeNull();
    expect(query('#custom-room-name')).toBeNull();
    expect(button('Custom').disabled).toBe(true);
    expect(query('.quiz-target text').textContent).toBe('?');
    change(query('.map-learn-answer input'), 'Waiting Room');
    click(button('Check'));
    expect(query('.map-learn-result').textContent).toBe('Correct');
  });

  test.each(['null', 'invalid json', '{"names":[],"size":900}'])('handles invalid stored preferences: %s', stored => {
    localStorage.setItem(STORAGE_KEY, stored);
    mount();
    expect(query('#callout-size').value).toBe('100');
    expect(query('.map-learn-custom-label')).toBeNull();
  });

  test('failed storage does not falsely save a name or lose the pending input', () => {
    mount();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    save(0, 'Unsaved name');
    expect(query('[role="alert"]').textContent).toContain('have not been saved');
    expect(query('#custom-room-name').value).toBe('Unsaved name');
    expect(query('.map-learn-custom-label')).toBeNull();
    expect(query('.map-learn-save-status').textContent).toBe('');
  });

  test('blank names cannot be saved and labels themselves select a room', () => {
    mount();
    click(query('.map-learn-room-label'));
    expect(query('#custom-room-name')).not.toBeNull();
    change(query('#custom-room-name'), '   ');
    expect(button('Save name').disabled).toBe(true);
  });

  test('time trial accepts selected-name clicks and drag/drop, then reloads its personal record', () => {
    mount();
    click(button('Quiz'));
    click(button('Start run'));
    const nameFor = id => id === 'a' ? 'Waiting Room' : 'East Stairs';
    const first = query('.quiz-target');
    const firstName = nameFor(first.dataset.roomId);
    const wrongName = firstName === 'Waiting Room' ? 'East Stairs' : 'Waiting Room';
    click(button(wrongName));
    click(first);
    expect(query('.map-learn-result').textContent).toMatch(/Try again/);
    expect(query('.map-quiz-progress-label').textContent).toContain('1 mistake');
    click(button(firstName));
    click(first);
    expect(query('progress').value).toBe(1);
    expect(query('.quiz-target').dataset.roomId).not.toBe(first.dataset.roomId);

    const payload = {};
    const dataTransfer = { setData: (key, value) => { payload[key] = value; }, getData: key => payload[key] || '' };
    const nextName = nameFor(query('.quiz-target').dataset.roomId);
    act(() => Simulate.dragStart(button(nextName), { dataTransfer }));
    expect(payload['application/x-clav-room-name']).toBe(nextName);
    act(() => Simulate.drop(query('.quiz-target'), { dataTransfer }));
    expect(query('.map-quiz-finish').textContent).toContain('All rooms matched!');
    expect(query('.map-quiz-leaderboard tbody').children).toHaveLength(1);
    reload();
    click(button('Quiz'));
    expect(query('.map-quiz-leaderboard tbody').children).toHaveLength(1);
  });

  test('multiple choice exposes available options, locks a reviewed answer and finishes with a score', () => {
    mount();
    click(button('Quiz'));
    click(button('Multiple Choice'));
    click(button('Start practice'));
    let options = [...container.querySelectorAll('.map-quiz-options button')];
    expect(options).toHaveLength(2);
    const firstName = query('.quiz-target').dataset.roomId === 'a' ? 'Waiting Room' : 'East Stairs';
    click(options.find(option => !option.textContent.includes(firstName)));
    expect(options.every(option => option.disabled)).toBe(true);
    expect(query('.map-learn-result').textContent).toBe(`Answer: ${firstName}`);
    click(button('Next room'));
    const nextName = query('.quiz-target').dataset.roomId === 'a' ? 'Waiting Room' : 'East Stairs';
    options = [...container.querySelectorAll('.map-quiz-options button')];
    click(options.find(option => option.textContent.includes(nextName)));
    click(button('See results'));
    expect(query('.map-quiz-finish').textContent).toContain('1 of 2 correct (50%).');
    expect(localStorage.getItem('clav-map-quiz-runs-v1')).toBeNull();
  });
});
