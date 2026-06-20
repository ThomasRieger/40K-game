class Unit {
    constructor(team, def, name, x, y) {
        this.team = team; this.name = name; this.x = x; this.y = y;
        this.type = def.role; this.color = def.color; this.radius = def.radius || 15; this.pts = def.pts || 0;
        this.m = def.m * 20; // inches → canvas px (1" = 20px)
        this.t = def.t; this.sv = def.sv; this.w = def.w; this.ld = def.ld; this.oc = def.oc;
        this.meleeWeapon = { ...def.meleeWeapon };
        this.rangedWeapon = { ...def.rangedWeapon, range: def.rangedWeapon.range * 20 };
        this.hp = this.w; this.chargeDist = 140; this.targetX = x; this.targetY = y;
        this.isMoving = false; this.moveSpeed = 5; this.hasActedThisPhase = false; this.buffed = false;
        this.img = new Image();
        this.img.src = def.icon; this.imgLoaded = false; this.img.onload = () => { this.imgLoaded = true; };
    }
    update() {
        if (this.isMoving) {
            const dx = this.targetX - this.x, dy = this.targetY - this.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.moveSpeed) { this.x = this.targetX; this.y = this.targetY; this.isMoving = false; }
            else { this.x += (dx / dist) * this.moveSpeed; this.y += (dy / dist) * this.moveSpeed; }
        }
    }
    draw(ctx, isSelected) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill();
        if (this.imgLoaded) { ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2); ctx.restore(); }
        if (this.buffed) { ctx.shadowBlur = 10; ctx.shadowColor = 'yellow'; }
        ctx.lineWidth = isSelected ? 3 / state.scale : 1 / state.scale; ctx.strokeStyle = isSelected ? '#fff' : '#000'; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 3 / state.scale, 0, Math.PI * 2); ctx.lineWidth = 2 / state.scale; ctx.strokeStyle = this.team === 1 ? '#4a90e2' : '#e24a4a'; ctx.stroke();
        const hpP = this.hp / this.w; ctx.fillStyle = '#f00'; ctx.fillRect(this.x - 15, this.y - 25, 30, 4); ctx.fillStyle = '#0f0'; ctx.fillRect(this.x - 15, this.y - 25, 30 * hpP, 4);
    }
}

class TerrainRect {
    constructor(x, y, w, h, color = '#444') { this.x = x; this.y = y; this.w = w; this.h = h; this.color = color; }
    draw(ctx) {
        ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2 / state.scale; ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);
    }
}
