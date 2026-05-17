# Room Loading UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Room Loading States and Join Modal to improve aesthetics and ensure consistent background visibility.

**Architecture:** Use CSS classes to remove opaque backgrounds and ensure centering.

**Tech Stack:** React, Next.js, Tailwind CSS.

---

### Task 1: Update Join Modal UI

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Modify join modal wrapper**
  - Locate `isJoining` block.
  - Update `bg-background/80` to `bg-background/20`.
  - Ensure `backdrop-blur-3xl` remains.

```tsx
<div className="fixed inset-0 z-[100] bg-background/20 backdrop-blur-3xl flex items-center justify-center p-6">
  <div className="glass p-10 rounded-[3rem] w-full max-w-md space-y-6 animate-slide-up border-white/10 shadow-2xl">
    {/* ... rest of content */}
  </div>
</div>
```

- [ ] **Step 2: Commit**
  - Commit change.

### Task 2: Update Room Loading States UI

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Update main `isLoading` return block**
  - Locate `isLoading` check at the start of `RoomPage` return.
  - Replace opaque background with centered, minimal content.

```tsx
  if (isLoading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
        <div className="text-foreground font-bold tracking-widest animate-pulse text-center">Loading room...</div>
    </div>
  );
```

- [ ] **Step 2: Update transition overlay**
  - Locate `roomStatus !== displayStatus` block.
  - Remove parent `bg-background` class.

```tsx
        {/* Transition Overlay / Loading State */}
        {roomStatus !== displayStatus ? (
           <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-8 py-12">
              <div className="relative group"><div className="w-20 h-20 border-4 border-white/[0.03] border-t-foreground rounded-full animate-spin" /></div>
              <div className="text-center space-y-2">
                 <h2 className="text-2xl sm:text-4xl font-bold text-foreground">
                    {roomStatus === "results" ? "Revealing Answer" : 
                     roomStatus === "question" ? "Revealing Question" : 
                     roomStatus === "wager" ? "Preparing Next Round" : "Synchronizing"}
                 </h2>
                 <p className="text-gray-600 font-bold tracking-wider text-[10px] animate-pulse italic uppercase">Setting the stage...</p>
              </div>
           </div>
        ) : (
          <>
          {/* ... */}
          </>
        )}
```

- [ ] **Step 3: Commit**
  - Commit changes.
