<template>
  <div class="surface-100 flex justify-content-center p-5">
    Отправляю на сервер...
    <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="var(--surface-ground)"
                     animationDuration=".5s" aria-label="Custom ProgressSpinner" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  stepIndex: number
}>();

const emit = defineEmits(['update:stepIndex']);
emit('update:stepIndex', props.stepIndex + 1);
</script>