<script setup>
import { ref } from 'vue';
import AdminMenuItem from './AdminMenuItem.vue';

const model = ref([
    {
        label: 'Analyze Graph',
        items: [{ label: 'Analyze Graph', icon: 'pi pi-fw pi-home', to: '/admin' }]
    },
    {
        label: 'Management',
        items: [
            { label: 'Attendance', icon: 'pi pi-fw pi-calendar', to: '/admin' },
        ]
    },
    {
        label: 'Settings',
        items: [
            { label: 'System', icon: 'pi pi-fw pi-cog', to: '/admin' },
        ]
    }
]);
</script>

<template>
    <ul class="admin-menu">
        <template v-for="(item, i) in model" :key="i">
            <admin-menu-item v-if="!item.separator" :item="item" :index="i"></admin-menu-item>
            <li v-if="item.separator" class="admin-menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
