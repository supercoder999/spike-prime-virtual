#ifndef CENGINE_GC_H
#define CENGINE_GC_H

#include "runtime.h"

Obj *gc_new_int(Runtime *rt, long value);
Obj *gc_new_bool(Runtime *rt, bool value);
Obj *gc_new_string(Runtime *rt, const char *value);
Obj *gc_new_list(Runtime *rt);
Obj *gc_new_function_user(Runtime *rt, UserFunction *fn);
Obj *gc_new_function_native(Runtime *rt, const RuntimeNative *native);
bool gc_list_append(Runtime *rt, Obj *list_obj, Obj *value);
void gc_mark_object(Obj *obj);
void gc_collect(Runtime *rt);

#endif
