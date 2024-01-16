<script setup lang="ts">
import {provide} from "vue";

provide('apiUrl', import.meta.env.PROD ? 'https://pass.ri-advance.ru' : 'http://localhost:3001');
</script>

<template>
  <RouterView />
</template>