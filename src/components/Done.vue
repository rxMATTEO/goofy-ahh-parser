<script setup lang="ts">

</script>

<template>
  <div class="surface-100 flex p-5 align-items-center gap-5 flex-column">
    Готово. Перейдите на главную страницу и перезагрузите ее.
    <Button @click="$router.push('/'); window.location.reload()">
      Перейти
    </Button>
  </div>
</template>

<style scoped>

</style>