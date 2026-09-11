/* Verified x86 runtime callback layouts. Add builds only after native tests. */
#ifndef PB_AI_RUNTIME_PROFILES_H
#define PB_AI_RUNTIME_PROFILES_H
typedef struct {int version; DWORD ms,ls; unsigned writer_phase,writer_callback;} RUNTIME_PROFILE;
static const RUNTIME_PROFILE profiles[]={
 {80,0x00080000,0x00022522,0x40,0x4c},
 {90,0x00090000,0x00032284,0x44,0x50}
};
#endif
