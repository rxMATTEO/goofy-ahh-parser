<script setup lang="ts">
import {computed, ref} from "vue";
import RtfUpload from "./RtfUpload.vue";

const steps = computed(() => {
  return [
    {
      label: 'Загрузка rtf',
    },
    {
      label: 'Загрузка rtf',
    },
    {
      label: 'Загрузка rtf',
    },
  ]
});

const stepIndex = ref(0);

const currentComponent = computed(() => {
  switch (stepIndex.value) {
    case 0: {
      return RtfUpload;
    }
  }
});
</script>

<template>
  <Button class="absolute right-0" @click="$router.go(-1)">Назад</Button>
  <div class="card w-8 m-auto">
    <Steps :model="steps" readonly v-model:activeStep="stepIndex" />
    <Toast/>
    <component :is="currentComponent" v-model:step-index="stepIndex" />
  </div>
</template>