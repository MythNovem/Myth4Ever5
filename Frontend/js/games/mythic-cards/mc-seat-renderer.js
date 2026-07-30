/**
 * mc-seat-renderer.js
 * Responsible for rendering player seats on the card table.
 * Single Responsibility: knows only about seat layout and player status display.
 */
class MCSeatRenderer {
    /** Renders all player seats dynamically based on player count */
    renderDynamicSeats(myPlayer, opponents, state) {
        const table = document.getElementById('card-table');
        if (!table) return;

        table.querySelectorAll('.player-seat:not(#seat-bottom-me)').forEach(el => el.remove());

        let meSeat = document.getElementById('seat-bottom-me');
        if (!meSeat) {
            meSeat = document.createElement('div');
            meSeat.id = 'seat-bottom-me';
            table.appendChild(meSeat);
        }
        this.fillSeat(meSeat, myPlayer, state, true, 'seat-bottom-me seat-me');

        const seatPositions = {
            1: ['seat-top-center'],
            2: ['seat-top-left', 'seat-top-right'],
            3: ['seat-left-mid', 'seat-top-center', 'seat-right-mid'],
        };
        const positions = seatPositions[opponents.length] || seatPositions[2];

        opponents.forEach((opp, i) => {
            const posClass = positions[i];
            const seat = document.createElement('div');
            seat.id = `seat-opp-${i}`;
            this.fillSeat(seat, opp, state, false, posClass);
            table.appendChild(seat);
        });
    }

    fillSeat(el, player, state, isMe, positionClass) {
        const isCurrentTurn = state.currentTurnPlayerId === player.playerId;
        const cardCount = state.playerCardCounts?.[player.playerId] ?? 0;

        el.className = ['player-seat', positionClass, isCurrentTurn ? 'is-turn' : '', !player.isAlive ? 'is-dead' : ''].join(' ').trim();
        el.innerHTML = `
            <div class="seat-avatar">${player.avatarUrl}</div>
            <div class="seat-name">${player.playerName}${isMe ? ' · Bạn' : ''}</div>
            <div class="seat-card-count">${player.isAlive ? `${cardCount} lá` : '💀'}</div>
            ${isCurrentTurn && state.turnsToTake > 1 ? `<div class="seat-turn-count">${state.turnsToTake} lượt</div>` : ''}
        `;
    }
}

window.mcSeatRenderer = new MCSeatRenderer();
