<script setup>
import AppFooter from '@/layout/AppFooter.vue';
import { useLayout } from '@/layout/composables/layout';
import GuestTopbar from '@/layout/guestlayout/GuestTopbar.vue';
import { ref, watch } from 'vue';
const { layoutState, isSidebarActive } = useLayout();

const outsideClickListener = ref(null);

watch(isSidebarActive, (newVal) => {
    if (newVal) {
        bindOutsideClickListener();
    } else {
        unbindOutsideClickListener();
    }
});

function bindOutsideClickListener() {
    if (!outsideClickListener.value) {
        outsideClickListener.value = (event) => {
            if (isOutsideClicked(event)) {
                layoutState.overlayMenuActive = false;
                layoutState.staticMenuMobileActive = false;
                layoutState.menuHoverActive = false;
            }
        };
        document.addEventListener('click', outsideClickListener.value);
    }
}

function unbindOutsideClickListener() {
    if (outsideClickListener.value) {
        document.removeEventListener('click', outsideClickListener);
        outsideClickListener.value = null;
    }
}

function isOutsideClicked(event) {
    const topbarEl = document.querySelector('.layout-menu-button');

    return !(topbarEl.isSameNode(event.target) || topbarEl.contains(event.target));
}
</script>

<template>
    <div class="layout-wrapper">
        <guest-topbar></guest-topbar>
        <div class="layout-main-container">
            <div class="profile-container">
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png" alt="Student Profile" class="profile-picture" />
            </div>
            <div class="layout-main">
                <!-- Search bar component -->
                <router-view></router-view>
            </div>
            <app-footer></app-footer>
        </div>
        <div class="layout-mask animate-fadein"></div>
    </div>
    <Toast />
</template>

<style lang="scss" scoped>
.profile-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin-bottom: 2rem;
    padding-top: 10%;
}

.profile-picture {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    border: 5px solid #fff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 0 20px 10px rgba(0, 0, 0, 0.1);
    }
}

.layout-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
}

.layout-main-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.layout-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    background-color: #f8f9fa;
    min-height: 400px;
    width: 100%;
    box-sizing: border-box;
}
</style>
