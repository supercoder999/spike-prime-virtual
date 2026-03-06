#ifndef CENGINE_ENGINE_H
#define CENGINE_ENGINE_H

#include <stddef.h>
#include <stdio.h>

#include "runtime.h"

int cengine_run_script(const char *script, FILE *out, char *error_buf, size_t error_buf_size);
int cengine_run_script_with_natives(
	const char *script,
	FILE *out,
	const RuntimeNative *natives,
	size_t native_count,
	char *error_buf,
	size_t error_buf_size);

#endif
